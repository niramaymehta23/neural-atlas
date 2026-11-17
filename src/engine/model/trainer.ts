/**
 * The worker's brain, kept free of worker globals so tests can drive it in-process.
 * Training runs in short slices; commands (pause, predict, new data) slot in between them,
 * strictly in arrival order. A `step` keeps its place in that order: commands sent while it
 * trains wait until it is done, so a replayed run applies its changes at exactly their epochs.
 */
import { createRandom, type Random } from "../random";
import { createAutodiffBackend } from "./backends/autodiff";
import { meanLoss, scoresToOutputs, type Backend } from "./backends/backend";
import { writeLive } from "./live";
import type { Command, Event, Samples, ScheduledChange } from "./protocol";

type InitCommand = Extract<Command, { type: "init" }>;
export type Post = (event: Event, transfer?: Transferable[]) => void;
export type LoadBackend = (init: InitCommand, random: Random) => Promise<Backend>;

/** Longest stretch of training before letting queued commands (or timers) in. */
const SLICE_MS = 12;
/** The newest parameters are read (and published) at most this often while training: one frame. */
const LIVE_MS = 16;

const loadBackend: LoadBackend = async (init, random) =>
  init.backend === "autodiff"
    ? createAutodiffBackend(init.model, init.train, random)
    : (await import("./backends/tfjs")).createTfjsBackend(init.model, init.train);

const wholeAtLeastOne = (value: number) => Number.isInteger(value) && value >= 1;
const allFinite = (values: Float64Array) => values.every(Number.isFinite);
/** Lets timers and incoming messages run between slices. */
const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** What one epoch came to: trained, nothing to learn from, or numbers that blew up. */
type Outcome = "trained" | "empty" | "diverged";

export function createTrainer(post: Post, load: LoadBackend = loadBackend) {
  let session: {
    init: InitCommand;
    backend: Backend;
    data: Samples;
    random: Random;
  } | null = null;
  let epoch = 0;
  let lastPosted = -1;
  let lastLoss = Number.NaN;
  /** The newest parameters read that were all numbers, to fall back on when a run blows up. */
  let lastGood: { epoch: number; loss: number; params: Float64Array } | null = null;
  let lastRead = -Infinity;
  let lastSnapshotAt = -Infinity;
  let running = false;
  /** Bumped by every run and pause, so a slice scheduled for an older run never trains. */
  let generation = 0;
  let queue = Promise.resolve();
  let liveSentAt = -Infinity;
  let liveWaiting: { epoch: number; loss: number; params: Float64Array } | null = null;

  const flushLive = () => {
    if (!liveWaiting) return;
    const { params } = liveWaiting;
    post({ type: "live", ...liveWaiting }, [params.buffer]);
    liveWaiting = null;
    liveSentAt = performance.now();
  };

  /** Shared memory when there is some; otherwise a throttled message that always ends on the newest. */
  const publish = (live: SharedArrayBuffer | null, loss: number, params: Float64Array) => {
    if (live) return writeLive(live, epoch, loss, params);
    const pending = liveWaiting !== null;
    // A copy: the same parameters may be handed (transferred) to a snapshot too.
    liveWaiting = { epoch, loss, params: params.slice() };
    if (pending) return;
    const wait = liveSentAt + LIVE_MS - performance.now();
    if (wait <= 0) flushLive();
    else setTimeout(flushLive, wait);
  };

  const enqueue = (task: () => Promise<void>) => {
    queue = queue.then(task).catch((error: unknown) => {
      running = false;
      post({ type: "error", message: error instanceof Error ? error.message : String(error) });
    });
    return queue;
  };

  const current = () => {
    if (!session) throw new Error("The model is not set up yet.");
    return session;
  };

  const shuffled = (count: number, random: Random) => {
    const order = Array.from({ length: count }, (_, index) => index);
    for (let index = count - 1; index > 0; index -= 1) {
      const swap = random.int(index + 1);
      [order[index], order[swap]] = [order[swap] ?? 0, order[index] ?? 0];
    }
    return order;
  };

  const postSnapshot = (loss: number, params: Float64Array) => {
    lastPosted = epoch;
    lastSnapshotAt = performance.now();
    // A copy: `params` is also kept as the last good parameters.
    const values = params.slice();
    post({ type: "snapshot", snapshot: { epoch, loss, params: values } }, [values.buffer]);
  };

  /** Reads the parameters; false (and nothing kept) when any of them is not a number. */
  const readGood = async () => {
    const params = await current().backend.readParameters();
    lastRead = performance.now();
    if (!allFinite(params)) return null;
    lastGood = { epoch, loss: lastLoss, params };
    return params;
  };

  /** Stops, puts back the last good parameters and says so (ENG-10). */
  const diverge = async (): Promise<Outcome> => {
    running = false;
    generation += 1;
    const { backend, init } = current();
    if (lastGood) {
      await backend.writeParameters(lastGood.params);
      epoch = lastGood.epoch;
      lastLoss = lastGood.loss;
      publish(init.live, lastLoss, lastGood.params);
    }
    post({ type: "diverged", epoch });
    return "diverged";
  };

  const trainEpoch = async (): Promise<Outcome> => {
    const { backend, data, random, init } = current();
    if (data.count === 0) return "empty";
    const loss = await backend.trainEpoch(data, shuffled(data.count, random), init.train.batchSize);
    if (!Number.isFinite(loss)) return diverge();
    epoch += 1;
    lastLoss = loss;
    const now = performance.now();
    const snapshotDue =
      epoch % init.train.snapshotEvery === 0 &&
      (!running || now - lastSnapshotAt >= (init.train.snapshotMs ?? 0));
    if (!snapshotDue && now - lastRead < LIVE_MS) return "trained";
    const params = await readGood();
    if (!params) return diverge();
    publish(init.live, loss, params);
    if (snapshotDue) postSnapshot(loss, params);
    return "trained";
  };

  /** Nothing to learn from: training stops by itself and says why (ENG-08). */
  const idle = () => {
    running = false;
    post({ type: "idle", reason: "no-data" });
  };

  const slice = (run: number) =>
    enqueue(async () => {
      const active = () => running && run === generation;
      const until = performance.now() + SLICE_MS;
      while (active() && performance.now() < until) {
        const outcome = await trainEpoch();
        if (outcome === "empty") idle();
        if (outcome !== "trained") break;
      }
      if (active()) setTimeout(() => void slice(run), 0);
    });

  /** Posts where training stopped: the newest parameters and a snapshot of them. */
  const settle = async () => {
    if (epoch === 0 || (lastPosted === epoch && lastGood?.epoch === epoch)) return;
    const params = lastGood?.epoch === epoch ? lastGood.params : await readGood();
    if (!params) return void (await diverge());
    publish(current().init.live, lastLoss, params);
    if (lastPosted !== epoch) postSnapshot(lastLoss, params);
  };

  const applyChange = async ({ data, optimiser }: Omit<ScheduledChange, "epoch">) => {
    if (data) current().data = data;
    if (optimiser) await current().backend.configure(optimiser);
  };

  /** `epochs` more, in slices, with each scheduled change applied before its epoch trains. */
  const stepThrough = async (epochs: number, schedule: readonly ScheduledChange[]) => {
    const target = epoch + epochs;
    const changes = [...schedule].sort((a, b) => a.epoch - b.epoch);
    let next = 0;
    let until = performance.now() + SLICE_MS;
    for (;;) {
      for (let change = changes[next]; change && change.epoch <= epoch; change = changes[next]) {
        await applyChange(change);
        next += 1;
      }
      if (epoch >= target) break;
      const outcome = await trainEpoch();
      if (outcome === "empty") return idle();
      if (outcome === "diverged") return;
      if (performance.now() >= until) {
        await breathe();
        until = performance.now() + SLICE_MS;
      }
    }
    await settle();
  };

  const handle = (command: Command): Promise<void> => {
    switch (command.type) {
      case "init":
        running = false;
        return enqueue(async () => {
          const { batchSize, snapshotEvery } = command.train;
          if (!wholeAtLeastOne(batchSize) || !wholeAtLeastOne(snapshotEvery))
            throw new Error("Batch size and snapshot spacing must be whole numbers, 1 or more.");
          session?.backend.dispose();
          session = null;
          const random = createRandom(command.train.seed);
          const backend = await load(command, random);
          session = { init: command, backend, data: command.data, random };
          epoch = 0;
          lastPosted = -1;
          lastGood = null;
          lastRead = lastSnapshotAt = -Infinity;
          liveWaiting = null;
          const { data, model } = command;
          lastLoss = meanLoss(await backend.scores(data.inputs, data.count), data, model);
          post({ type: "ready", backend: backend.name });
          // The untrained model is drawable at once: a live frame and a first snapshot (MLP-08).
          const params = await readGood();
          if (!params) return void (await diverge());
          publish(command.live, lastLoss, params);
          postSnapshot(lastLoss, params);
        });
      case "run":
        if (running) return queue;
        running = true;
        generation += 1;
        return slice(generation);
      case "pause":
        running = false;
        generation += 1;
        return enqueue(settle);
      case "step":
        running = false;
        generation += 1;
        return enqueue(() => stepThrough(Math.max(0, command.epochs), command.schedule ?? []));
      case "setData":
      case "configure":
        return enqueue(async () => {
          current();
          await applyChange(command);
          if (command.tag !== undefined) post({ type: "applied", tag: command.tag, epoch });
        });
      case "restore":
        return enqueue(async () => {
          const { backend, init } = current();
          await backend.writeParameters(command.snapshot.params);
          epoch = lastPosted = command.snapshot.epoch;
          lastLoss = command.snapshot.loss;
          lastGood = { epoch, loss: lastLoss, params: command.snapshot.params.slice() };
          publish(init.live, lastLoss, command.snapshot.params);
        });
      case "predict":
        return enqueue(async () => {
          const { backend, init } = current();
          const width = init.model.sizes[0] ?? 1;
          const count = command.inputs.length / width;
          const outputs = scoresToOutputs(await backend.scores(command.inputs, count), init.model);
          post({ type: "prediction", id: command.id, outputs }, [outputs.buffer]);
        });
    }
  };

  return { handle };
}

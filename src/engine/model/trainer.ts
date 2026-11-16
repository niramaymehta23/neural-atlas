/**
 * The worker's brain, kept free of worker globals so tests can drive it in-process.
 * Training runs in short slices; commands (pause, predict, new data) slot in between them,
 * strictly in arrival order.
 */
import { createRandom, type Random } from "../random";
import { createAutodiffBackend } from "./backends/autodiff";
import { scoresToOutputs, type Backend } from "./backends/backend";
import { writeLive } from "./live";
import type { Command, Event, Samples } from "./protocol";

type InitCommand = Extract<Command, { type: "init" }>;
export type Post = (event: Event, transfer?: Transferable[]) => void;
export type LoadBackend = (init: InitCommand, random: Random) => Promise<Backend>;

/** Longest stretch of training before letting queued commands in. */
const SLICE_MS = 12;

const loadBackend: LoadBackend = async (init, random) =>
  init.backend === "autodiff"
    ? createAutodiffBackend(init.model, init.train, random)
    : (await import("./backends/tfjs")).createTfjsBackend(init.model, init.train);

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
  let running = false;
  /** Bumped by every run and pause, so a slice scheduled for an older run never trains. */
  let generation = 0;
  let queue = Promise.resolve();

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

  const postSnapshot = async (loss: number, params?: Float64Array) => {
    const values = params ?? (await current().backend.readParameters());
    lastPosted = epoch;
    post({ type: "snapshot", snapshot: { epoch, loss, params: values } }, [values.buffer]);
  };

  const trainEpoch = async () => {
    const { backend, data, random, init } = current();
    lastLoss = await backend.trainEpoch(data, shuffled(data.count, random), init.train.batchSize);
    epoch += 1;
    const params = await backend.readParameters();
    writeLive(init.live, epoch, lastLoss, params);
    if (epoch % init.train.snapshotEvery === 0) await postSnapshot(lastLoss, params);
  };

  const slice = (run: number) =>
    enqueue(async () => {
      const current = () => running && run === generation;
      const until = performance.now() + SLICE_MS;
      while (current() && performance.now() < until) await trainEpoch();
      if (current()) setTimeout(() => void slice(run), 0);
    });

  const settle = async () => {
    if (epoch > 0 && lastPosted !== epoch) await postSnapshot(lastLoss);
  };

  const handle = (command: Command): Promise<void> => {
    switch (command.type) {
      case "init":
        running = false;
        return enqueue(async () => {
          session?.backend.dispose();
          const random = createRandom(command.train.seed);
          const backend = await load(command, random);
          session = { init: command, backend, data: command.data, random };
          epoch = 0;
          lastPosted = -1;
          post({ type: "ready", backend: backend.name });
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
        return enqueue(async () => {
          for (let count = 0; count < command.epochs; count += 1) await trainEpoch();
          await settle();
        });
      case "setData":
        return enqueue(async () => {
          current().data = command.data;
        });
      case "configure":
        return enqueue(async () => current().backend.configure(command.optimiser));
      case "restore":
        return enqueue(async () => {
          const { backend, init } = current();
          await backend.writeParameters(command.snapshot.params);
          epoch = lastPosted = command.snapshot.epoch;
          lastLoss = command.snapshot.loss;
          writeLive(init.live, epoch, lastLoss, command.snapshot.params);
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

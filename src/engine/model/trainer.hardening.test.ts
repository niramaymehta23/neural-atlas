// @vitest-environment node
import { createRandom } from "../random";
import { parameterCount } from "./backends/backend";
import { createTfjsBackend, type WatchDevice } from "./backends/tfjs";
import { createLiveBuffer, readLive } from "./live";
import { ModelEngine, type WorkerPort } from "./model-engine";
import type { Command, Event, ModelSpec, Samples, Snapshot, TrainSettings } from "./protocol";
import { createTrainer } from "./trainer";

function blobs(count: number, seed: number): Samples {
  const random = createRandom(seed);
  const inputs = new Float32Array(count * 2);
  const targets = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const label = index % 2;
    inputs[index * 2] = (label ? 0.5 : -0.5) + random.normal() * 0.2;
    inputs[index * 2 + 1] = random.normal() * 0.4;
    targets[index] = label;
  }
  return { inputs, targets, count };
}

const NONE: Samples = { inputs: new Float32Array(), targets: new Float32Array(), count: 0 };
const MODEL: ModelSpec = { sizes: [2, 6, 1], activation: "tanh", loss: "binaryCrossEntropy" };
const TRAIN: TrainSettings = {
  optimiser: { kind: "adam", learningRate: 0.02 },
  batchSize: 8,
  seed: 5,
  snapshotEvery: 5,
};

function harness(options: { data?: Samples; model?: ModelSpec; train?: TrainSettings } = {}) {
  const events: Event[] = [];
  const trainer = createTrainer((event) => events.push(event));
  const model = options.model ?? MODEL;
  const live = createLiveBuffer(parameterCount(model.sizes));
  const send = (command: Command) => trainer.handle(command);
  const of = <T extends Event["type"]>(type: T) =>
    events.filter((event): event is Extract<Event, { type: T }> => event.type === type);
  const snapshots = () => of("snapshot").map(({ snapshot }) => snapshot);
  const init = send({
    type: "init",
    backend: "autodiff",
    model,
    data: options.data ?? blobs(40, 1),
    train: options.train ?? TRAIN,
    live,
  });
  return { events, send, of, snapshots, live, init };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("trainer with nothing to learn from (ENG-08)", () => {
  it("does not spin on an empty garden: run and step stop at once and say why", async () => {
    const { send, of, snapshots, init } = harness({ data: NONE });
    await init;
    expect(snapshots().map(({ epoch, loss }) => [epoch, loss])).toEqual([[0, 0]]);
    void send({ type: "run" });
    await wait(40);
    expect(of("idle")).toEqual([{ type: "idle", reason: "no-data" }]);
    await send({ type: "step", epochs: 1_000_000 });
    expect(of("idle")).toHaveLength(2);
    expect(snapshots()).toHaveLength(1);
  });

  it("stops by itself when the data is taken away mid-run", async () => {
    const { send, of, init } = harness();
    await init;
    void send({ type: "run" });
    await wait(20);
    await send({ type: "setData", data: NONE });
    await wait(40);
    expect(of("idle")).toHaveLength(1);
    const stopped = of("live").length + of("snapshot").length;
    await wait(30);
    expect(of("live").length + of("snapshot").length).toBe(stopped);
  });

  it.each([
    ["batch size 0", { ...TRAIN, batchSize: 0 }],
    ["snapshot spacing 0", { ...TRAIN, snapshotEvery: 0 }],
    ["batch size 2.5", { ...TRAIN, batchSize: 2.5 }],
  ])("refuses %s instead of looping forever", async (_, train) => {
    const { of, init } = harness({ train });
    await init;
    expect(of("error")[0]?.message).toMatch(/whole numbers/);
    expect(of("ready")).toEqual([]);
  });
});

describe("trainer when the steps blow up (ENG-10)", () => {
  const LINE: ModelSpec = { sizes: [1, 1], activation: "identity", loss: "meanSquared" };
  const line = (): Samples => ({
    inputs: Float32Array.from([1, 2, 3, 4]),
    targets: Float32Array.from([2, 4, 6, 8]),
    count: 4,
  });

  it("stops, says so and keeps the last good parameters (SGD at a step of a million)", async () => {
    const train: TrainSettings = {
      optimiser: { kind: "sgd", learningRate: 1e6 },
      batchSize: 4,
      seed: 1,
      snapshotEvery: 1,
    };
    const { send, of, live, snapshots, init } = harness({ data: line(), model: LINE, train });
    await init;
    await send({ type: "step", epochs: 500 });
    const [diverged] = of("diverged");
    expect(diverged).toBeDefined();
    expect(diverged!.epoch).toBeLessThan(500);
    const newest = readLive(live)!;
    expect(newest.epoch).toBe(diverged!.epoch);
    expect([...newest.params].every(Number.isFinite)).toBe(true);
    expect(snapshots().every(({ params, loss }) => [...params, loss].every(Number.isFinite))).toBe(
      true,
    );

    // Running again from there blows up again at once rather than training on broken numbers.
    void send({ type: "run" });
    await wait(30);
    expect(of("diverged").length).toBeGreaterThanOrEqual(2);
    expect([...readLive(live)!.params].every(Number.isFinite)).toBe(true);
  });
});

describe("trainer replays a run exactly (ENG-09)", () => {
  const params = (snapshots: Snapshot[]) => snapshots.at(-1)!.params;

  it("changes made at their epochs give identical parameters when replayed from a schedule", async () => {
    const more = blobs(60, 9);
    // The learner's run: 50 epochs, a bigger step and more data, 50 more.
    const learner = harness();
    await learner.init;
    await learner.send({ type: "step", epochs: 50 });
    await learner.send({
      type: "configure",
      optimiser: { kind: "adam", learningRate: 0.08 },
      tag: 1,
    });
    await learner.send({ type: "step", epochs: 20 });
    await learner.send({ type: "setData", data: more, tag: 2 });
    await learner.send({ type: "step", epochs: 30 });
    expect(learner.of("applied")).toEqual([
      { type: "applied", tag: 1, epoch: 50 },
      { type: "applied", tag: 2, epoch: 70 },
    ]);

    // The link: same start, the same changes scheduled at the epochs they happened.
    const link = harness();
    await link.init;
    await link.send({
      type: "step",
      epochs: 100,
      schedule: [
        { epoch: 70, data: more },
        { epoch: 50, optimiser: { kind: "adam", learningRate: 0.08 } },
      ],
    });
    expect(params(link.snapshots())).toEqual(params(learner.snapshots()));
    expect(link.snapshots().at(-1)!.epoch).toBe(100);
  });

  it("replays in slices, so a long replay keeps the worker answering", async () => {
    const { send, events, init } = harness();
    await init;
    const replay = send({ type: "step", epochs: 3000 });
    let checks = 0;
    const timer = setInterval(() => (checks += 1), 1);
    await replay;
    clearInterval(timer);
    expect(checks).toBeGreaterThan(2);
    expect(events.filter((event) => event.type === "snapshot").at(-1)).toMatchObject({
      snapshot: { epoch: 3000 },
    });
  });

  it("posts at most one snapshot per snapshotMs while running, and always the last", async () => {
    const { send, snapshots, init } = harness({
      train: { ...TRAIN, snapshotEvery: 1, snapshotMs: 50 },
    });
    await init;
    void send({ type: "run" });
    await wait(260);
    await send({ type: "pause" });
    const taken = snapshots().slice(1);
    const live = taken.slice(0, -1);
    // Without the limit this would be hundreds; with it, roughly one per 50 ms.
    expect(live.length).toBeLessThanOrEqual(7);
    expect(taken.at(-1)!.epoch).toBeGreaterThan(live.at(-1)?.epoch ?? 0);
  });
});

describe("TensorFlow.js backend (ENG-11)", () => {
  const spec: ModelSpec = { sizes: [2, 5, 1], activation: "tanh", loss: "binaryCrossEntropy" };
  const train: TrainSettings = { ...TRAIN, optimiser: { kind: "adam", learningRate: 0.01 } };
  const data = blobs(32, 3);
  const order = Array.from({ length: data.count }, (_, index) => index);

  async function trained(change?: (backend: Awaited<ReturnType<typeof make>>) => Promise<void>) {
    const backend = await make();
    for (let epoch = 0; epoch < 3; epoch += 1) await backend.trainEpoch(data, order, 8);
    await change?.(backend);
    for (let epoch = 0; epoch < 3; epoch += 1) await backend.trainEpoch(data, order, 8);
    const params = await backend.readParameters();
    backend.dispose();
    return params;
  }
  const make = () => createTfjsBackend(spec, train, ["cpu"]);

  it("changing Adam's step keeps its memory and really changes the step", async () => {
    const plain = await trained();
    const same = await trained((backend) =>
      Promise.resolve(backend.configure({ kind: "adam", learningRate: 0.01 })),
    );
    const bigger = await trained((backend) =>
      Promise.resolve(backend.configure({ kind: "adam", learningRate: 0.2 })),
    );
    // Carrying the averages over is invisible; a bigger step is not.
    [...same].forEach((value, index) => expect(value).toBeCloseTo(plain[index]!, 5));
    const moved = (params: Float64Array) =>
      params.reduce((sum, value, index) => sum + Math.abs(value - plain[index]!), 0);
    expect(moved(bigger)).toBeGreaterThan(0.05);
  }, 20_000);

  it("adds up an epoch's mistakes on the device and reads them once", async () => {
    const backend = await make();
    const loss = await backend.trainEpoch(data, order, 8);
    expect(Number.isFinite(loss)).toBe(true);
    expect(loss).toBeGreaterThan(0);
    backend.dispose();
  });

  it("carries on from the newest parameters when the graphics device is lost", async () => {
    let lose: () => void = () => {};
    const watch: WatchDevice = (_, onLost) => {
      lose = onLost;
    };
    const backend = await createTfjsBackend(spec, train, ["cpu"], watch);
    await backend.trainEpoch(data, order, 8);
    const before = await backend.readParameters();
    lose();
    const scores = await backend.scores(data.inputs, data.count);
    expect(scores).toHaveLength(data.count);
    expect(await backend.readParameters()).toEqual(before);
    expect(Number.isFinite(await backend.trainEpoch(data, order, 8))).toBe(true);
    expect(backend.name).toBe("tfjs-cpu");
    backend.dispose();
  }, 20_000);
});

describe("ModelEngine after dispose (MLP-06)", () => {
  it("ignores a closed worker's queued snapshots and stops sending", () => {
    const sent: Command[] = [];
    const port: WorkerPort = {
      onmessage: null,
      postMessage: (command) => void sent.push(command),
      terminate: vi.fn(),
    };
    const snapshots: Snapshot[] = [];
    const engine = new ModelEngine(
      {
        backend: "autodiff",
        model: MODEL,
        data: blobs(10, 1),
        train: TRAIN,
        onSnapshot: (snapshot) => snapshots.push(snapshot),
      },
      () => port,
    );
    const deliver = port.onmessage!;
    engine.dispose();
    expect(port.onmessage).toBeNull();
    deliver({
      data: { type: "snapshot", snapshot: { epoch: 5, loss: 1, params: new Float64Array(25) } },
    } as MessageEvent<Event>);
    engine.run();
    expect(snapshots).toEqual([]);
    expect(sent.map(({ type }) => type)).toEqual(["init"]);
    expect(port.terminate).toHaveBeenCalledTimes(1);
  });

  it("hands idle, diverged and applied events to their callbacks", () => {
    const port: WorkerPort = { onmessage: null, postMessage: () => {}, terminate: () => {} };
    const seen: string[] = [];
    const engine = new ModelEngine(
      {
        backend: "autodiff",
        model: MODEL,
        data: blobs(10, 1),
        train: TRAIN,
        onIdle: (reason) => seen.push(`idle ${reason}`),
        onDiverged: (epoch) => seen.push(`diverged ${epoch}`),
        onApplied: (tag, epoch) => seen.push(`applied ${tag} ${epoch}`),
        onError: (message) => seen.push(`error ${message}`),
      },
      () => port,
    );
    for (const data of [
      { type: "idle", reason: "no-data" },
      { type: "diverged", epoch: 12 },
      { type: "applied", tag: 3, epoch: 40 },
    ] as Event[])
      port.onmessage?.({ data } as MessageEvent<Event>);
    expect(seen).toEqual(["idle no-data", "diverged 12", "applied 3 40"]);
    engine.dispose();
  });
});

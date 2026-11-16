// @vitest-environment node
import { createRandom } from "../random";
import { parameterCount } from "./backends/backend";
import { createLiveBuffer, readLive } from "./live";
import { ModelEngine, type WorkerPort } from "./model-engine";
import type {
  BackendKind,
  Command,
  Event,
  ModelSpec,
  Samples,
  Snapshot,
  TrainSettings,
} from "./protocol";
import { createTrainer } from "./trainer";

/** Two interleaved spiral arms, labelled 0 and 1. */
function spiral(count: number, seed: number): Samples {
  const random = createRandom(seed);
  const inputs = new Float32Array(count * 2);
  const targets = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const label = index % 2;
    const t = (index / count) * 3 + 0.3;
    const angle = t * 2.2 + label * Math.PI + random.normal() * 0.08;
    inputs[index * 2] = (t / 3.3) * Math.cos(angle);
    inputs[index * 2 + 1] = (t / 3.3) * Math.sin(angle);
    targets[index] = label;
  }
  return { inputs, targets, count };
}

const MODEL: ModelSpec = { sizes: [2, 12, 12, 1], activation: "tanh", loss: "binaryCrossEntropy" };
const TRAIN: TrainSettings = {
  optimiser: { kind: "adam", learningRate: 0.03 },
  batchSize: 16,
  seed: 3,
  snapshotEvery: 5,
};

function harness(backend: BackendKind = "autodiff", model = MODEL, data = spiral(120, 1)) {
  const events: Event[] = [];
  const trainer = createTrainer((event) => events.push(event));
  const live = createLiveBuffer(parameterCount(model.sizes));
  const send = (command: Command) => trainer.handle(command);
  const snapshots = () =>
    events.flatMap((event) => (event.type === "snapshot" ? [event.snapshot] : []));
  const init = send({ type: "init", backend, model, data, train: TRAIN, live });
  return { events, send, snapshots, live, init };
}

describe("trainer", () => {
  it("learns the spiral and posts a snapshot every few epochs", async () => {
    const { send, snapshots, events, init } = harness();
    await init;
    expect(events[0]).toEqual({ type: "ready", backend: "autodiff" });
    await send({ type: "step", epochs: 60 });
    const losses = snapshots().map(({ loss }) => loss);
    expect(snapshots().map(({ epoch }) => epoch)).toEqual(
      Array.from({ length: 12 }, (_, index) => (index + 1) * 5),
    );
    expect(losses.at(-1)).toBeLessThan(losses[0]! * 0.6);
  });

  it("gives an identical run for the same seed", async () => {
    const run = async () => {
      const { send, snapshots, init } = harness();
      await init;
      await send({ type: "step", epochs: 20 });
      return snapshots();
    };
    const [a, b] = [await run(), await run()];
    expect(a.map(({ loss }) => loss)).toEqual(b.map(({ loss }) => loss));
    expect(a.at(-1)!.params).toEqual(b.at(-1)!.params);
  });

  it("writes every epoch to shared memory", async () => {
    const { send, live, snapshots, init } = harness();
    await init;
    expect(readLive(live)).toBeNull();
    await send({ type: "step", epochs: 7 });
    const frame = readLive(live)!;
    expect(frame.epoch).toBe(7);
    expect(frame.params).toEqual(snapshots().at(-1)!.params);
  });

  it("runs until paused, then settles on a snapshot of where it stopped", async () => {
    const { send, snapshots, init } = harness();
    await init;
    void send({ type: "run" });
    await new Promise((resolve) => setTimeout(resolve, 80));
    await send({ type: "pause" });
    const stopped = snapshots().at(-1)!;
    expect(stopped.epoch).toBeGreaterThan(0);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(snapshots().at(-1)).toBe(stopped);
  });

  it("keeps a single training loop through quick pause and run toggles", async () => {
    const { send, snapshots, init } = harness();
    await init;
    void send({ type: "run" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    for (let toggle = 0; toggle < 5; toggle += 1) {
      void send({ type: "pause" });
      void send({ type: "run" });
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
    await send({ type: "pause" });
    const epochs = snapshots().map(({ epoch }) => epoch);
    expect(epochs.every((epoch, index) => index === 0 || epoch > epochs[index - 1]!)).toBe(true);
    const settled = snapshots().length;
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(snapshots()).toHaveLength(settled);
  });

  it("restores a recorded moment and predicts probabilities", async () => {
    const { send, snapshots, events, init } = harness();
    await init;
    await send({ type: "step", epochs: 10 });
    const early = snapshots()[0]!;
    const grid = new Float32Array([0.1, 0.2, -0.5, 0.4]);
    await send({ type: "restore", snapshot: early });
    await send({ type: "predict", id: 1, inputs: grid });
    await send({ type: "step", epochs: 5 });
    await send({ type: "restore", snapshot: early });
    await send({ type: "predict", id: 2, inputs: grid });
    const [first, second] = events.flatMap((event) =>
      event.type === "prediction" ? [event.outputs] : [],
    );
    expect(first).toHaveLength(2);
    expect(first!.every((p) => p > 0 && p < 1)).toBe(true);
    expect(second).toEqual(first);
  });

  it("reports commands sent before setup as an error", async () => {
    const events: Event[] = [];
    await createTrainer((event) => events.push(event)).handle({ type: "step", epochs: 1 });
    expect(events).toEqual([{ type: "error", message: "The model is not set up yet." }]);
  });

  it("trains the same network with TensorFlow.js (CPU here)", async () => {
    const model: ModelSpec = {
      sizes: [2, 8, 3],
      activation: "leakyRelu",
      loss: "softmaxCrossEntropy",
    };
    const data = spiral(60, 2);
    data.targets.forEach((_, index) => (data.targets[index] = index % 3));
    const { send, snapshots, events, init } = harness("tfjs", model, data);
    await init;
    expect(events[0]).toEqual({ type: "ready", backend: "tfjs-cpu" });
    await send({ type: "step", epochs: 30 });
    const [first, last] = [snapshots()[0]!, snapshots().at(-1)!];
    expect(last.loss).toBeLessThan(first.loss);
    expect(last.params).toHaveLength(parameterCount(model.sizes));
    await send({ type: "restore", snapshot: first });
    await send({ type: "predict", id: 1, inputs: new Float32Array([0.2, 0.3]) });
    const outputs = events.flatMap((event) =>
      event.type === "prediction" ? [event.outputs] : [],
    )[0]!;
    expect(outputs.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 5);
  }, 20_000);
});

describe("ModelEngine", () => {
  /** Connects the engine to an in-process trainer through the same message shapes. */
  function inProcess(): WorkerPort {
    const port: WorkerPort = {
      onmessage: null,
      postMessage: (command) => void trainer.handle(structuredClone(command)),
      terminate: () => {},
    };
    const trainer = createTrainer((event) =>
      queueMicrotask(() => port.onmessage?.({ data: event } as MessageEvent<Event>)),
    );
    return port;
  }

  it("records snapshots, reads live parameters and answers predictions", async () => {
    const snapshots: Snapshot[] = [];
    const engine = new ModelEngine(
      {
        backend: "autodiff",
        model: MODEL,
        data: spiral(80, 4),
        train: TRAIN,
        onSnapshot: (s) => snapshots.push(s),
      },
      inProcess,
    );
    expect(await engine.ready).toBe("autodiff");
    engine.step(10);
    const outputs = await engine.predict(new Float32Array([0, 0, 0.5, 0.5, -0.5, 0.2]));
    expect(outputs).toHaveLength(3);
    expect(snapshots.map(({ epoch }) => epoch)).toEqual([5, 10]);
    expect(engine.readLive()?.params).toEqual(snapshots[1]!.params);
    engine.dispose();
  });

  it("settles predictions when the worker reports an error or closes", async () => {
    const errors: string[] = [];
    const port = inProcess();
    const engine = new ModelEngine(
      {
        backend: "autodiff",
        model: MODEL,
        data: spiral(20, 1),
        train: TRAIN,
        onError: (m) => errors.push(m),
      },
      () => port,
    );
    await engine.ready;
    // The worker reports a failure while a prediction is in flight.
    const broken = engine.predict(new Float32Array([Number.NaN]));
    port.onmessage?.({ data: { type: "error", message: "boom" } } as MessageEvent<Event>);
    await expect(broken).rejects.toThrow("boom");
    expect(errors).toContain("boom");
    const closed = engine.predict(new Float32Array([0, 0]));
    engine.dispose();
    await expect(closed).rejects.toThrow("closed");
  });
});

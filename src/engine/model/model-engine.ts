/**
 * The page's handle on training. Owns the one worker, speaks the typed protocol, hands snapshots
 * to whoever records them (the Timeline), and reads the newest parameters straight from shared
 * memory each frame. Needs cross-origin isolation (the site always has it: see public/_headers).
 */
import type { OptimiserSettings } from "../autodiff/optimisers";
import { parameterCount } from "./backends/backend";
import { createLiveBuffer, readLive, type LiveFrame } from "./live";
import type {
  BackendKind,
  Command,
  Event,
  ModelSpec,
  Samples,
  Snapshot,
  TrainSettings,
} from "./protocol";

/** The slice of a Worker the engine uses, so tests can connect an in-process trainer. */
export type WorkerPort = {
  postMessage(command: Command, options?: { transfer?: Transferable[] }): void;
  onmessage: ((message: MessageEvent<Event>) => void) | null;
  terminate(): void;
};

export type ModelEngineOptions = {
  backend: BackendKind;
  model: ModelSpec;
  data: Samples;
  train: TrainSettings;
  onSnapshot?: (snapshot: Snapshot) => void;
  onError?: (message: string) => void;
};

const startWorker = (): WorkerPort =>
  new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerPort;

export class ModelEngine {
  /** Resolves with the backend actually running ("autodiff", "tfjs-webgpu", …). */
  readonly ready: Promise<string>;
  private readonly port: WorkerPort;
  private readonly live: SharedArrayBuffer;
  private readonly pending = new Map<
    number,
    { resolve: (outputs: Float32Array) => void; reject: (error: Error) => void }
  >();
  private nextId = 0;

  constructor(
    private readonly options: ModelEngineOptions,
    connect: () => WorkerPort = startWorker,
  ) {
    this.live = createLiveBuffer(parameterCount(options.model.sizes));
    this.port = connect();
    let markReady: (backend: string) => void = () => {};
    let failReady: (error: Error) => void = () => {};
    this.ready = new Promise((resolve, reject) => {
      markReady = resolve;
      failReady = reject;
    });
    this.ready.catch(() => {}); // reported through onError; awaiting callers still see it
    this.port.onmessage = ({ data: event }) => {
      if (event.type === "ready") markReady(event.backend);
      else if (event.type === "snapshot") this.options.onSnapshot?.(event.snapshot);
      else if (event.type === "prediction") {
        this.pending.get(event.id)?.resolve(event.outputs);
        this.pending.delete(event.id);
      } else {
        // An error ends whatever was in flight: no prediction waits forever.
        failReady(new Error(event.message));
        this.settleAll(event.message);
        this.options.onError?.(event.message);
      }
    };
    const { backend, model, data, train } = options;
    this.send({ type: "init", backend, model, data, train, live: this.live });
  }

  run(): void {
    this.send({ type: "run" });
  }

  pause(): void {
    this.send({ type: "pause" });
  }

  step(epochs = 1): void {
    this.send({ type: "step", epochs });
  }

  configure(optimiser: OptimiserSettings): void {
    this.send({ type: "configure", optimiser });
  }

  setData(data: Samples): void {
    this.send({ type: "setData", data });
  }

  /** Continues training from a recorded moment (after scrubbing back). */
  restore(snapshot: Snapshot): void {
    this.send({ type: "restore", snapshot });
  }

  /** Outputs for many inputs at once (a DecisionField grid), computed in the worker. */
  predict(inputs: Float32Array): Promise<Float32Array> {
    const id = (this.nextId += 1);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ type: "predict", id, inputs });
    });
  }

  /** The newest parameters, read from shared memory without a message. Cheap enough per frame. */
  readLive(): LiveFrame | null {
    return readLive(this.live);
  }

  dispose(): void {
    this.port.terminate();
    this.settleAll("The model was closed.");
  }

  private settleAll(message: string): void {
    for (const { reject } of this.pending.values()) reject(new Error(message));
    this.pending.clear();
  }

  private send(command: Command): void {
    this.port.postMessage(command);
  }
}

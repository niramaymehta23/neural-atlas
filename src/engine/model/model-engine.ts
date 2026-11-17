/**
 * The page's handle on training. Owns its own worker, speaks the typed protocol, hands snapshots
 * to whoever records them (the Timeline), and reads the newest parameters each frame: straight
 * from shared memory when the page is cross-origin isolated (see public/_headers), otherwise from
 * the copies the worker posts about once a frame.
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
  ScheduledChange,
  Snapshot,
  TrainSettings,
} from "./protocol";

/** The slice of a Worker the engine uses, so tests can connect an in-process trainer. */
export type WorkerPort = {
  postMessage(command: Command, options?: { transfer?: Transferable[] }): void;
  onmessage: ((message: MessageEvent<Event>) => void) | null;
  /** The worker could not start (its script failed to load) or threw outside the trainer. */
  onerror?: (() => void) | null;
  /** A message from the worker could not be read. */
  onmessageerror?: (() => void) | null;
  terminate(): void;
};

export type ModelEngineOptions = {
  backend: BackendKind;
  model: ModelSpec;
  data: Samples;
  train: TrainSettings;
  onSnapshot?: (snapshot: Snapshot) => void;
  onError?: (message: string) => void;
  /** Training stopped by itself because there is nothing to learn from (ENG-08). */
  onIdle?: (reason: "no-data") => void;
  /** The steps grew too big: training stopped, back on the last good parameters (ENG-10). */
  onDiverged?: (epoch: number) => void;
  /** A tagged `setData` or `configure` took effect before epoch `epoch + 1`. */
  onApplied?: (tag: number, epoch: number) => void;
};

/** A worker that has not said it is ready by then is treated as failed. */
export const READY_TIMEOUT_MS = 20_000;

const sharedMemory = () =>
  typeof SharedArrayBuffer !== "undefined" && globalThis.crossOriginIsolated !== false;

const startWorker = (): WorkerPort =>
  new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerPort;

export class ModelEngine {
  /** Resolves with the backend actually running ("autodiff", "tfjs-webgpu", …). */
  readonly ready: Promise<string>;
  private readonly port: WorkerPort;
  /** Null without cross-origin isolation; `copied` then holds the newest posted frame. */
  private readonly live: SharedArrayBuffer | null;
  private copied: LiveFrame | null = null;
  private readonly readyTimer: ReturnType<typeof setTimeout>;
  private readonly pending = new Map<
    number,
    { resolve: (outputs: Float32Array) => void; reject: (error: Error) => void }
  >();
  private nextId = 0;
  private disposed = false;

  constructor(
    private readonly options: ModelEngineOptions,
    connect: () => WorkerPort = startWorker,
  ) {
    this.live = sharedMemory() ? createLiveBuffer(parameterCount(options.model.sizes)) : null;
    let markReady: (backend: string) => void = () => {};
    let failReady: (error: Error) => void = () => {};
    this.ready = new Promise((resolve, reject) => {
      markReady = resolve;
      failReady = reject;
    });
    this.ready.catch(() => {}); // reported through onError; awaiting callers still see it
    // An error ends whatever was in flight: no prediction or `ready` waits forever.
    const fail = (message: string) => {
      if (this.disposed) return;
      clearTimeout(this.readyTimer);
      failReady(new Error(message));
      this.settleAll(message);
      this.options.onError?.(message);
    };
    this.readyTimer = setTimeout(
      () => fail("The training worker did not start."),
      READY_TIMEOUT_MS,
    );
    // Every failure, even a worker that cannot be created, arrives through `ready` and onError.
    try {
      this.port = connect();
    } catch (error) {
      this.port = { onmessage: null, postMessage: () => {}, terminate: () => {} };
      const message = error instanceof Error ? error.message : String(error);
      queueMicrotask(() => fail(message));
    }
    this.port.onerror = () => fail("The training worker could not start.");
    this.port.onmessageerror = () => fail("A message from the training worker could not be read.");
    this.port.onmessage = ({ data: event }) => {
      // A closed engine's worker may still have messages queued: none reach the new run (MLP-06).
      if (this.disposed) return;
      if (event.type === "ready") {
        clearTimeout(this.readyTimer);
        markReady(event.backend);
      } else if (event.type === "snapshot") this.options.onSnapshot?.(event.snapshot);
      else if (event.type === "live") {
        const { epoch, loss, params } = event;
        this.copied = { epoch, loss, params, version: (this.copied?.version ?? 0) + 1 };
      } else if (event.type === "prediction") {
        this.pending.get(event.id)?.resolve(event.outputs);
        this.pending.delete(event.id);
      } else if (event.type === "applied") this.options.onApplied?.(event.tag, event.epoch);
      else if (event.type === "idle") this.options.onIdle?.(event.reason);
      else if (event.type === "diverged") this.options.onDiverged?.(event.epoch);
      else fail(event.message);
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

  /** Trains `epochs` more, applying `schedule`'s changes at their epochs (a replayed run). */
  step(epochs = 1, schedule?: readonly ScheduledChange[]): void {
    this.send({ type: "step", epochs, schedule });
  }

  /** With a `tag`, `onApplied` later says at which epoch it took effect. */
  configure(optimiser: OptimiserSettings, tag?: number): void {
    this.send({ type: "configure", optimiser, tag });
  }

  /** With a `tag`, `onApplied` later says at which epoch it took effect. */
  setData(data: Samples, tag?: number): void {
    this.send({ type: "setData", data, tag });
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

  /** The newest parameters (from shared memory, or the latest posted copy). Cheap enough per frame. */
  readLive(): LiveFrame | null {
    return this.live ? readLive(this.live) : this.copied;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.readyTimer);
    this.port.onmessage = null;
    this.port.onerror = null;
    this.port.onmessageerror = null;
    this.port.terminate();
    this.settleAll("The model was closed.");
  }

  private settleAll(message: string): void {
    for (const { reject } of this.pending.values()) reject(new Error(message));
    this.pending.clear();
  }

  private send(command: Command): void {
    if (!this.disposed) this.port.postMessage(command);
  }
}

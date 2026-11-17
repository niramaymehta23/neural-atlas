/**
 * The page's handle on the picture model: one worker shared by every lesson that reads pictures,
 * started on first use and ended once nothing has used it for a minute. A stalled load or a stuck
 * picture times out, ends the worker and fails what was waiting, so the lesson can offer Try again.
 */
import type { VisionCommand, VisionEvent, VisionStage } from "./protocol";
import type { Fooled, Seen } from "./seeing";

/** The slice of a Worker the reader uses, so tests can connect a fake. */
export type VisionPort = {
  postMessage(command: VisionCommand, transfer: Transferable[]): void;
  onmessage: ((message: MessageEvent<VisionEvent>) => void) | null;
  onerror?: ((event: Event) => void) | null;
  terminate(): void;
};

/** A first load (the 2 MB model, then setting up the device) gives up after this long. */
export const LOAD_TIMEOUT_MS = 60_000;
/**
 * A ready reader gives up on one picture after this long. Fooling is the slow case: four passes back
 * through the model, which take seconds on a computer's CPU when it has no graphics chip to use.
 */
export const READ_TIMEOUT_MS = 60_000;
/** A worker nobody has used for this long is ended, freeing the model's memory. */
export const IDLE_MS = 60_000;

/** Why a picture failed: "load" means the model never started; "see" means only this picture. */
export class VisionError extends Error {
  constructor(
    readonly stage: VisionStage,
    message: string,
  ) {
    super(message);
    this.name = "VisionError";
  }
}

export type VisionStatus = "idle" | "loading" | "ready";

const startWorker = (): VisionPort =>
  new Worker(new URL("./vision-worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as VisionPort;

type Waiting = { resolve: (value: Seen | Fooled) => void; reject: (error: Error) => void };

export class VisionReader {
  private port: VisionPort | null = null;
  private status: VisionStatus = "idle";
  private device: string | null = null;
  private nextId = 0;
  private readonly pending = new Map<number, Waiting>();
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private idle: ReturnType<typeof setTimeout> | null = null;
  private users = 0;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly connect: () => VisionPort = startWorker) {}

  /** What the model sees in a 224 × 224 RGBA picture. The bytes are handed over (emptied here). */
  see(pixels: Uint8ClampedArray, options: { maps?: boolean; features?: boolean } = {}) {
    return this.ask((id) => ({
      type: "see",
      id,
      pixels,
      maps: options.maps ?? false,
      features: options.features ?? false,
    })) as Promise<Seen>;
  }

  /** The picture nudged by at most `strength` shades per colour to change the model's answer. */
  fool(pixels: Uint8ClampedArray, strength: number) {
    return this.ask((id) => ({ type: "fool", id, pixels, strength })) as Promise<Fooled>;
  }

  /** Says a scene is using the reader; call the returned function when it stops. */
  retain(): () => void {
    this.users += 1;
    if (this.idle) clearTimeout(this.idle);
    this.idle = null;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.users -= 1;
      if (this.users === 0) this.idle = setTimeout(() => this.rest(), IDLE_MS);
    };
  }

  readonly getStatus = (): VisionStatus => this.status;
  /** The device the model runs on once ready ("tfjs-webgl" or "tfjs-cpu"), else null. */
  readonly getDevice = (): string | null => this.device;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Whether a worker is running now (for tests). */
  get running(): boolean {
    return this.port !== null;
  }

  private setStatus(status: VisionStatus): void {
    if (status === this.status) return;
    this.status = status;
    for (const listener of this.listeners) listener();
  }

  private ask(command: (id: number) => VisionCommand): Promise<Seen | Fooled> {
    const id = (this.nextId += 1);
    return new Promise((resolve, reject) => {
      const port = this.worker();
      this.pending.set(id, { resolve, reject });
      this.arm(port);
      const message = command(id);
      port.postMessage(message, [message.pixels.buffer]);
    });
  }

  private worker(): VisionPort {
    if (this.port) return this.port;
    const port = this.connect();
    port.onmessage = ({ data: event }) => {
      if (this.port !== port) return;
      if (event.type === "ready") {
        this.device = event.device;
        this.setStatus("ready");
        this.arm(port);
        return;
      }
      const waiting = this.pending.get(event.id);
      if (!waiting) return;
      this.pending.delete(event.id);
      this.arm(port);
      if (event.type === "seen") waiting.resolve(event.seen);
      else if (event.type === "fooled") waiting.resolve(event.fooled);
      else {
        if (event.stage === "load") this.reset(port, "load", event.message);
        waiting.reject(new VisionError(event.stage, event.message));
      }
    };
    // A worker that fails to start never answers: fail everything waiting, and start afresh next time.
    port.onerror = () => this.reset(port, "load", "The picture reader could not start.");
    this.port = port;
    this.device = null;
    this.setStatus("loading");
    return port;
  }

  /** Restarts the watchdog while pictures are waiting: a long wait for a first load, a short one after. */
  private arm(port: VisionPort): void {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
    if (this.pending.size === 0) return;
    const ready = this.status === "ready";
    this.watchdog = setTimeout(
      () => this.reset(port, ready ? "see" : "load", "The picture reader took too long."),
      ready ? READ_TIMEOUT_MS : LOAD_TIMEOUT_MS,
    );
  }

  /** Ends an unused worker. */
  private rest(): void {
    this.idle = null;
    if (this.users > 0 || this.pending.size > 0 || !this.port) return;
    const port = this.port;
    this.port = null;
    this.device = null;
    this.setStatus("idle");
    port.terminate();
  }

  /** Ends a broken worker and fails every picture waiting on it. */
  private reset(port: VisionPort, stage: VisionStage, message: string): void {
    if (this.port !== port) return;
    this.port = null;
    this.device = null;
    port.terminate();
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
    this.setStatus("idle");
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const { reject } of waiting) reject(new VisionError(stage, message));
  }
}

let shared: VisionReader | null = null;

/** The page's one picture reader, created on first use. */
export function visionReader(): VisionReader {
  shared ??= new VisionReader();
  return shared;
}

/** For tests: use this reader as the page's one (null goes back to a real worker next time). */
export function setVisionReader(reader: VisionReader | null) {
  shared = reader;
}

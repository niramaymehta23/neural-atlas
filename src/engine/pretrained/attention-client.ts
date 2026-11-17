/**
 * The page's handle on the attention model: one worker shared by every lesson that reads
 * sentences, a small memory of recent readings so going back to a sentence is instant, and how
 * far a first load has got. The worker is ended once nothing has used it for a minute.
 */
import { readable, type Reading } from "./attention";
import type { AttentionCommand, AttentionEvent, FailureStage } from "./protocol";

/** The slice of a Worker the reader uses, so tests can connect a fake. */
export type AttentionPort = {
  postMessage(command: AttentionCommand): void;
  onmessage: ((message: MessageEvent<AttentionEvent>) => void) | null;
  /** A worker that cannot start (its script or the model runtime failed to load). */
  onerror?: ((event: Event) => void) | null;
  terminate(): void;
};

/** Readings kept for going back, by the bytes their numbers take (a long sentence is ~2 MB). */
export const MEMORY_BYTES = 16 * 1024 * 1024;
/** A first load gives up after this long without any of the model arriving. */
export const STALL_TIMEOUT_MS = 30_000;
/**
 * Once every byte has arrived the model is set up on this device, which sends no progress and can
 * take a slow phone (or a busy computer) well over the stall time; it gets this long instead.
 */
export const SETUP_TIMEOUT_MS = 120_000;
/** A loaded reader gives up on one reading after this long. */
export const READ_TIMEOUT_MS = 10_000;
/** A worker nobody has used for this long is ended, freeing the model's memory. */
export const IDLE_MS = 60_000;

/** Why a reading failed: "load" means the model never started; "read" means only this sentence. */
export class ReaderError extends Error {
  constructor(
    readonly stage: FailureStage,
    message: string,
  ) {
    super(message);
    this.name = "ReaderError";
  }
}

/** How a first load is going: null before one starts and once the model is ready. */
export type LoadProgress = number | null;

const startWorker = (): AttentionPort =>
  new Worker(new URL("./attention-worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as AttentionPort;

type Remembered = { reading: Promise<Reading>; bytes: number };

export class AttentionReader {
  private port: AttentionPort | null = null;
  /** Whether the current worker has answered once, so its model is loaded. */
  private warm = false;
  private nextId = 0;
  private readonly pending = new Map<
    number,
    { resolve: (reading: Reading) => void; reject: (error: Error) => void }
  >();
  /** Oldest first: a reading used again moves to the end. */
  private readonly memory = new Map<string, Remembered>();
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private idle: ReturnType<typeof setTimeout> | null = null;
  private users = 0;
  private progress: LoadProgress = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly connect: () => AttentionPort = startWorker) {}

  /** Reads a sentence (as the lesson reads it: at most 16 words); the model loads on first use. */
  read(sentence: string): Promise<Reading> {
    const key = readable(sentence);
    const remembered = this.memory.get(key);
    if (remembered) {
      this.memory.delete(key);
      this.memory.set(key, remembered);
      return remembered.reading;
    }
    const id = (this.nextId += 1);
    const reading = new Promise<Reading>((resolve, reject) => {
      const port = this.worker();
      this.pending.set(id, { resolve, reject });
      this.arm(port);
      port.postMessage({ type: "read", id, sentence: key });
    });
    const entry: Remembered = { reading, bytes: 0 };
    this.memory.set(key, entry);
    reading.then(
      ({ weights }) => {
        entry.bytes = weights.byteLength;
        this.forgetOldest();
      },
      // A failed reading is forgotten, so it can be asked again.
      () => {
        if (this.memory.get(key) === entry) this.memory.delete(key);
      },
    );
    return reading;
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

  /** How far a first load has got (0–1), or null when none is under way. */
  readonly getProgress = (): LoadProgress => this.progress;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Whether a worker is running now (for tests and the idle check). */
  get running(): boolean {
    return this.port !== null;
  }

  private setProgress(progress: LoadProgress): void {
    if (progress === this.progress) return;
    this.progress = progress;
    for (const listener of this.listeners) listener();
  }

  /** Drops the least recently used readings once their numbers take more than MEMORY_BYTES. */
  private forgetOldest(): void {
    let total = 0;
    for (const { bytes } of this.memory.values()) total += bytes;
    for (const [key, { bytes }] of this.memory) {
      if (total <= MEMORY_BYTES || this.memory.size <= 1) break;
      if (bytes === 0) continue; // still being read
      this.memory.delete(key);
      total -= bytes;
    }
  }

  private worker(): AttentionPort {
    if (this.port) return this.port;
    const port = this.connect();
    port.onmessage = ({ data: event }) => {
      if (this.port !== port) return;
      if (event.type === "progress") {
        if (!this.warm) this.setProgress(event.fraction);
        this.arm(port);
        return;
      }
      const waiting = this.pending.get(event.id);
      if (event.type === "reading") {
        this.warm = true;
        this.setProgress(null);
      }
      if (!waiting) return;
      this.pending.delete(event.id);
      this.arm(port);
      if (event.type === "reading") waiting.resolve(event.reading);
      else {
        if (event.stage === "load") this.setProgress(null);
        waiting.reject(new ReaderError(event.stage, event.message));
      }
    };
    // A worker that fails to start never answers: fail everything waiting, and start afresh next time.
    port.onerror = () => this.reset(port, "load", "The reader could not start.");
    this.port = port;
    this.warm = false;
    this.setProgress(0);
    return port;
  }

  /**
   * Restarts the watchdog while readings are waiting: a first load may take as long as it likes
   * while the model keeps arriving, but not a stall; setting it up once it has all arrived gets a
   * longer wait; a loaded reader gets a short wait per reading.
   */
  private arm(port: AttentionPort): void {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
    if (this.pending.size === 0) return;
    const warm = this.warm;
    const wait = warm
      ? READ_TIMEOUT_MS
      : this.progress !== null && this.progress >= 1
        ? SETUP_TIMEOUT_MS
        : STALL_TIMEOUT_MS;
    this.watchdog = setTimeout(
      () => this.reset(port, warm ? "read" : "load", "The reader took too long."),
      wait,
    );
  }

  /** Ends an unused worker; its readings stay remembered. */
  private rest(): void {
    this.idle = null;
    if (this.users > 0 || this.pending.size > 0 || !this.port) return;
    const port = this.port;
    this.port = null;
    this.warm = false;
    port.terminate();
  }

  /** Ends a broken worker and fails every reading waiting on it. */
  private reset(port: AttentionPort, stage: FailureStage, message: string): void {
    if (this.port !== port) return;
    this.port = null;
    this.warm = false;
    port.terminate();
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
    this.setProgress(null);
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const { reject } of waiting) reject(new ReaderError(stage, message));
  }
}

let shared: AttentionReader | null = null;

/** The page's one reader, created on first use. */
export function attentionReader(): AttentionReader {
  shared ??= new AttentionReader();
  return shared;
}

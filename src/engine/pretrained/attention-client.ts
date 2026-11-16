/**
 * The page's handle on the attention model: one worker shared by every lesson that reads
 * sentences, and a small memory of recent readings so going back to a sentence is instant.
 */
import type { Reading } from "./attention";
import type { AttentionCommand, AttentionEvent } from "./protocol";

/** The slice of a Worker the reader uses, so tests can connect a fake. */
export type AttentionPort = {
  postMessage(command: AttentionCommand): void;
  onmessage: ((message: MessageEvent<AttentionEvent>) => void) | null;
  /** A worker that cannot start (its script or the model runtime failed to load). */
  onerror?: ((event: Event) => void) | null;
};

const REMEMBERED = 32;

const startWorker = (): AttentionPort =>
  new Worker(new URL("./attention-worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as AttentionPort;

export class AttentionReader {
  private port: AttentionPort | null = null;
  private nextId = 0;
  private readonly pending = new Map<
    number,
    { resolve: (reading: Reading) => void; reject: (error: Error) => void }
  >();
  private readonly memory = new Map<string, Promise<Reading>>();

  constructor(private readonly connect: () => AttentionPort = startWorker) {}

  /** Reads a sentence; the model loads on the first call. */
  read(sentence: string): Promise<Reading> {
    const remembered = this.memory.get(sentence);
    if (remembered) return remembered;
    const id = (this.nextId += 1);
    const reading = new Promise<Reading>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker().postMessage({ type: "read", id, sentence });
    });
    this.memory.set(sentence, reading);
    // A failed reading is forgotten, so it can be asked again.
    reading.catch(() => this.memory.delete(sentence));
    const oldest = this.memory.keys().next().value;
    if (this.memory.size > REMEMBERED && oldest !== undefined) this.memory.delete(oldest);
    return reading;
  }

  private worker(): AttentionPort {
    if (this.port) return this.port;
    const port = this.connect();
    port.onmessage = ({ data: event }) => {
      const waiting = this.pending.get(event.id);
      this.pending.delete(event.id);
      if (event.type === "reading") waiting?.resolve(event.reading);
      else waiting?.reject(new Error(event.message));
    };
    // A worker that fails to start never answers: fail everything waiting, and start afresh next time.
    port.onerror = () => {
      const waiting = [...this.pending.values()];
      this.pending.clear();
      this.port = null;
      for (const { reject } of waiting) reject(new Error("The reader could not start."));
    };
    this.port = port;
    return port;
  }
}

let shared: AttentionReader | null = null;

/** The page's one reader, created on first use. */
export function attentionReader(): AttentionReader {
  shared ??= new AttentionReader();
  return shared;
}

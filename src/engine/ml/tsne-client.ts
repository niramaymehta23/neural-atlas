/**
 * The page's handle on one map run: its own worker, so 1,000 dots settle without holding up the
 * page (the spec's risk note). A worker that fails to start, or a message it cannot read, is
 * reported through `onError`.
 */
import { onTabHidden } from "../tab";
import type { MapCommand, MapEvent } from "./tsne-protocol";

/** The slice of a Worker the client uses, so tests can connect the host in-process. */
export type MapPort = {
  postMessage(command: MapCommand, options?: { transfer?: Transferable[] }): void;
  onmessage: ((message: MessageEvent<MapEvent>) => void) | null;
  onerror?: (() => void) | null;
  onmessageerror?: (() => void) | null;
  terminate(): void;
};

export type MapClientOptions = {
  onFrame: (frame: Extract<MapEvent, { type: "frame" }>) => void;
  onStopped?: (step: number) => void;
  onError: (message: string) => void;
};

const startWorker = (): MapPort =>
  new Worker(new URL("./tsne-worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as MapPort;

export class MapClient {
  private readonly port: MapPort;
  private run = 0;
  private disposed = false;
  private readonly stopWatching: () => void = () => undefined;

  constructor(
    private readonly options: MapClientOptions,
    connect: () => MapPort = startWorker,
  ) {
    try {
      this.port = connect();
    } catch (error) {
      this.port = { postMessage: () => {}, onmessage: null, terminate: () => {} };
      queueMicrotask(() => options.onError(error instanceof Error ? error.message : String(error)));
      this.disposed = true;
      return;
    }
    this.port.onmessage = ({ data }) => {
      if (this.disposed) return;
      if (data.type === "error") return this.options.onError(data.message);
      if (data.run !== this.run) return;
      if (data.type === "frame") this.options.onFrame(data);
      else this.options.onStopped?.(data.step);
    };
    this.port.onerror = () => this.fail("The map worker could not start.");
    this.port.onmessageerror = () => this.fail("A message from the map worker could not be read.");
    this.stopWatching = onTabHidden((resting) => this.port.postMessage({ type: "rest", resting }));
  }

  private fail(message: string) {
    if (!this.disposed) this.options.onError(message);
  }

  /** Starts a fresh run (a new run number, so the old run's late messages are ignored). */
  start(data: Float64Array, dims: number, perplexity: number, seed: number) {
    if (this.disposed) return;
    this.run += 1;
    this.port.postMessage({ type: "start", run: this.run, data, dims, perplexity, seed });
  }

  /** Steps until `until` steps have been taken. */
  go(until: number) {
    if (!this.disposed) this.port.postMessage({ type: "go", run: this.run, until });
  }

  pause() {
    if (!this.disposed) this.port.postMessage({ type: "pause", run: this.run });
  }

  /** Ends the worker; safe to call twice. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stopWatching();
    this.port.onmessage = null;
    this.port.terminate();
  }
}

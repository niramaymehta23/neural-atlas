/**
 * The page's handle on one agent run: its own worker, so practice never holds up the page. A
 * worker that fails to start, or a message it cannot read, is reported through `onError`.
 */
import type { AgentCommand, AgentEvent, AgentRunConfig } from "./agent-protocol";

/** The slice of a Worker the client uses, so tests can connect the host in-process. */
export type AgentPort = {
  postMessage(command: AgentCommand): void;
  onmessage: ((message: MessageEvent<AgentEvent>) => void) | null;
  onerror?: (() => void) | null;
  onmessageerror?: (() => void) | null;
  terminate(): void;
};

export type AgentClientOptions = {
  onMoment: (moment: Extract<AgentEvent, { type: "moment" }>) => void;
  onStopped?: (step: number) => void;
  onError: (message: string) => void;
};

const startWorker = (): AgentPort =>
  new Worker(new URL("./agent-worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as AgentPort;

/** How a client reaches its worker; tests swap `connect` for an in-process host. */
export const agentConnection = { connect: startWorker };

export class AgentClient {
  private readonly port: AgentPort;
  private run = 0;
  private disposed = false;

  constructor(private readonly options: AgentClientOptions) {
    try {
      this.port = agentConnection.connect();
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
      if (data.type === "moment") this.options.onMoment(data);
      else this.options.onStopped?.(data.step);
    };
    this.port.onerror = () => this.fail("The practice worker could not start.");
    this.port.onmessageerror = () =>
      this.fail("A message from the practice worker could not be read.");
  }

  private fail(message: string) {
    if (!this.disposed) this.options.onError(message);
  }

  /** Starts a fresh run (a new run number, so the old run's late messages are ignored). */
  start(config: AgentRunConfig) {
    if (this.disposed) return;
    this.run += 1;
    this.port.postMessage({ type: "start", run: this.run, config });
  }

  /** Practises until `until` steps have been taken, at most `perSecond` a second when given. */
  go(until: number, perSecond?: number) {
    if (!this.disposed) this.port.postMessage({ type: "go", run: this.run, until, perSecond });
  }

  pause() {
    if (!this.disposed) this.port.postMessage({ type: "pause", run: this.run });
  }

  /** Ends the worker; safe to call twice. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.port.onmessage = null;
    this.port.terminate();
  }
}

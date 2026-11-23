/**
 * The page's handle on one practice worker, so practice never holds up the page. A worker that
 * fails to start, or a message it cannot read, is reported through `onError`.
 */
import type { PracticeCommand, PracticeEvent } from "./protocol";

/** The slice of a Worker the client uses, so tests can connect the host in-process. */
export type PracticePort<Config, Moment> = {
  postMessage(command: PracticeCommand<Config>): void;
  onmessage: ((message: MessageEvent<PracticeEvent<Moment>>) => void) | null;
  onerror?: (() => void) | null;
  onmessageerror?: (() => void) | null;
  terminate(): void;
};

export type PracticeClientOptions<Moment> = {
  onMoment: (moment: { type: "moment"; run: number } & Moment) => void;
  onStopped?: (step: number) => void;
  onError: (message: string) => void;
};

export class PracticeClient<Config, Moment> {
  private readonly port: PracticePort<Config, Moment>;
  private run = 0;
  private disposed = false;

  constructor(
    connect: () => PracticePort<Config, Moment>,
    private readonly options: PracticeClientOptions<Moment>,
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
  start(config: Config) {
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

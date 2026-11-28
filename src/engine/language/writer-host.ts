/**
 * The worker side of baby GPT, kept free of `self` so tests can drive it in-process: it practises
 * in short slices, giving way between them so a pause or a new run is heard, and posts a moment
 * every MOMENT_EVERY steps.
 */
import { createSlices, type Later } from "../slices";
import { createWriterRun, MOMENT_EVERY, type WriterRun } from "./baby-gpt";
import type { WriterCommand, WriterEvent } from "./writer-protocol";

/** Work done before giving way. */
const SLICE_MS = 12;

export function createWriterHost(
  post: (event: WriterEvent) => void,
  later?: Later,
  now: () => number = () => performance.now(),
) {
  const slices = createSlices(later);
  let run = -1;
  let writer: WriterRun | null = null;
  let until = 0;
  let stepping = false;

  const fail = (error: unknown) => {
    stepping = false;
    writer = null;
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  };

  const slice = () => {
    const current = writer;
    if (!current || !stepping) return;
    try {
      const started = now();
      while (current.step < until && now() - started < SLICE_MS) {
        current.advance();
        if (current.step % MOMENT_EVERY === 0) post({ type: "moment", run, ...current.moment() });
      }
    } catch (error) {
      return fail(error);
    }
    if (current.step >= until) {
      stepping = false;
      post({ type: "stopped", run, step: current.step });
      return;
    }
    slices.next(slice);
  };

  return (command: WriterCommand) => {
    if (command.type === "start") {
      run = command.run;
      stepping = false;
      try {
        writer = createWriterRun(command.config);
        post({ type: "moment", run, ...writer.moment() });
      } catch (error) {
        fail(error);
      }
      return;
    }
    if (command.type === "rest") return slices.rest(command.resting);
    if (command.run !== run || !writer) return;
    if (command.type === "pause") {
      if (stepping) {
        stepping = false;
        post({ type: "stopped", run, step: writer.step });
      }
      return;
    }
    until = command.until;
    if (!stepping) {
      stepping = true;
      slices.next(slice);
    }
  };
}

/**
 * The worker side of practice, kept free of `self` so tests can drive it in-process: it practises
 * in short slices, giving way between them so a pause or a new run is heard, keeps to the pace it
 * was asked for, and posts a moment every few steps. Moments fall on fixed steps, so a run's
 * moments never depend on how its work was sliced or paced.
 */
import { createSlices, type Later } from "../slices";
import type { PracticeCommand, PracticeEvent, PracticeRun } from "./protocol";

/** Work done before giving way. */
const SLICE_MS = 12;

export function createPracticeHost<Config, Moment extends object>(
  begin: (config: Config) => PracticeRun<Moment>,
  post: (event: PracticeEvent<Moment>) => void,
  later?: Later,
  now: () => number = () => performance.now(),
) {
  const slices = createSlices(later);
  let run = -1;
  let practising: PracticeRun<Moment> | null = null;
  let until = 0;
  let stepping = false;
  /** Steps a second (0: as fast as it can), counted from `paceFrom`. */
  let pace = 0;
  let paceFrom = { time: 0, step: 0 };

  const fail = (error: unknown) => {
    stepping = false;
    practising = null;
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  };

  const slice = () => {
    const current = practising;
    if (!current || !stepping) return;
    let allowed = until;
    try {
      const started = now();
      if (pace > 0)
        allowed = Math.min(
          until,
          paceFrom.step + Math.floor(((started - paceFrom.time) * pace) / 1000),
        );
      while (current.step < allowed && now() - started < SLICE_MS) {
        current.advance();
        if (current.step % current.every === 0) post({ type: "moment", run, ...current.moment() });
      }
    } catch (error) {
      return fail(error);
    }
    if (current.step >= until) {
      stepping = false;
      post({ type: "stopped", run, step: current.step });
      return;
    }
    // Ahead of the pace: wait for the next step's turn; behind it: carry straight on.
    slices.next(slice, current.step >= allowed ? Math.ceil(1000 / pace) : 0);
  };

  return (command: PracticeCommand<Config>) => {
    if (command.type === "start") {
      run = command.run;
      stepping = false;
      try {
        practising = begin(command.config);
        post({ type: "moment", run, ...practising.moment() });
      } catch (error) {
        fail(error);
      }
      return;
    }
    if (command.type === "rest") {
      // Back again: the pace is counted from here, so it does not rush to make up the time away.
      if (!command.resting && practising) paceFrom = { time: now(), step: practising.step };
      slices.rest(command.resting);
      return;
    }
    if (command.run !== run || !practising) return;
    if (command.type === "pause") {
      if (stepping) {
        stepping = false;
        post({ type: "stopped", run, step: practising.step });
      }
      return;
    }
    until = command.until;
    pace = command.perSecond && command.perSecond > 0 ? command.perSecond : 0;
    paceFrom = { time: now(), step: practising.step };
    if (practising.step >= until) {
      // Already there: say so, so the page knows it has nothing to wait for.
      stepping = false;
      post({ type: "stopped", run, step: practising.step });
      return;
    }
    if (!stepping) {
      stepping = true;
      slices.next(slice);
    }
  };
}

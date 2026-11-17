/**
 * Rolling downhill's state: the race settings, the roll count and the learner's guessed stopping
 * spots. The race itself (valleys, walkers, the run) is the shared landscape race.
 */
import type { RaceFrame, Spot, Valley } from "@/features/building/race/race";
import { WALKERS } from "@/features/building/race/race";

export type DownhillFrame = RaceFrame;

export type DownhillState = {
  valley: Valley;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** "How much it keeps rolling", 0–1 on the dial: the rolling ball's memory. */
  keepRolling: number;
  start: Spot;
  /** How many times the walkers have been let go; 0 until the first. */
  runs: number;
  /** Where the learner guessed each walker would stop (in walker order), for one roll. */
  marks: Spot[];
  /** The roll the marks are for: `runs + 1` while waiting, `runs` once that roll happened. */
  marksFor: number;
};

/** The marks shown now: those for the coming roll, or for the roll on screen. */
export const shownMarks = ({
  marks,
  marksFor,
  runs,
}: Pick<DownhillState, "marks" | "marksFor" | "runs">) =>
  marksFor === runs + 1 || marksFor === runs ? marks : [];

/** The marks with a new guess placed: the next walker's, starting afresh after a roll. */
export function placeMark(state: Pick<DownhillState, "marks" | "marksFor" | "runs">, at: Spot) {
  const fresh = state.marksFor !== state.runs + 1;
  const marks = fresh ? [] : state.marks;
  return {
    marks: marks.length < WALKERS.length ? [...marks, at] : [...marks.slice(1), at],
    marksFor: state.runs + 1,
  };
}

/**
 * One tiny brain cell: three voices, each trusted by some amount, added up against how hard the
 * cell is to convince, then bent into a yes or a no with some sureness. Nothing trains here: the
 * learner sets the trust by pulling strings.
 */
import type { TimelineFrame } from "@/platform/contract";

export const VOICES = ["sun", "weekend", "friends"] as const;
export type VoiceId = (typeof VOICES)[number];

export type CellState = {
  /** How much the cell trusts each voice (−MAX_TRUST…MAX_TRUST); below zero pushes against yes. */
  weights: number[];
  /** Which voices say yes today (1) or stay quiet (0). */
  voices: number[];
  /** "How hard it is to convince", 0–1 on the dial. */
  convince: number;
  /** "How firmly it decides", 0–1 on the dial. */
  firmness: number;
  /** How many changes the learner has made, so the guess waits for a first try. */
  changes: number;
};

export const MAX_TRUST = 3;
const THRESHOLD = { min: -2, max: 6 };
const STEEP = { min: 0.5, max: 8 };

/** How much total trust it takes to tip the cell towards yes. */
export const threshold = (dial: number) => THRESHOLD.min + dial * (THRESHOLD.max - THRESHOLD.min);
export const dialForThreshold = (value: number) =>
  (value - THRESHOLD.min) / (THRESHOLD.max - THRESHOLD.min);
export const steepness = (dial: number) => STEEP.min + dial * (STEEP.max - STEEP.min);

/** The cell's total for some voices: trust of each voice saying yes, less how hard it is to convince. */
export function score(state: Pick<CellState, "weights" | "convince">, voices: readonly number[]) {
  return (
    VOICES.reduce((sum, _, index) => sum + (state.weights[index] ?? 0) * (voices[index] ?? 0), 0) -
    threshold(state.convince)
  );
}

/** The chance of yes the cell gives for some voices. */
export function sayYes(
  state: Pick<CellState, "weights" | "convince" | "firmness">,
  voices: readonly number[],
) {
  return 1 / (1 + Math.exp(-steepness(state.firmness) * score(state, voices)));
}

/** Every mix of the three voices: all quiet first, all saying yes last. */
export const MIXES: readonly number[][] = Array.from({ length: 8 }, (_, mix) =>
  VOICES.map((_, index) => (mix >> (VOICES.length - 1 - index)) & 1),
);

/** True when no mix of voices gets a yes out of the cell. */
export const neverYes = (state: Pick<CellState, "weights" | "convince">) =>
  MIXES.every((voices) => score(state, voices) < 0);

/** How sure a chance of yes is, as a word key. */
export function sureness(chance: number): "very" | "quite" | "unsure" {
  const how = Math.abs(2 * chance - 1);
  return how > 0.8 ? "very" : how > 0.3 ? "quite" : "unsure";
}

/** The example the guess is about: the sun stays away, but it is the weekend and friends go. */
export const EXAMPLE = [0, 1, 1] as const;

export const INITIAL: CellState = {
  weights: [2.5, 1, 1],
  voices: [1, 1, 0],
  convince: dialForThreshold(2.4),
  firmness: 0.4,
  changes: 0,
};

export type CellFrame = TimelineFrame;

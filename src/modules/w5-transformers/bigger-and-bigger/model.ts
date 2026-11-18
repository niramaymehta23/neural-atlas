/**
 * How good a language model gets from its brain size (numbers it learns), how much it reads (word
 * pieces) and its computing budget, using the fitted law from DeepMind's Chinchilla paper
 * (Hoffmann et al., 2022): surprise L = 1.69 + 406.4 / N^0.34 + 410.7 / D^0.28. Training costs
 * about 6 × N × D steps of arithmetic; reading stops when the budget runs out.
 */
import type { TimelineFrame } from "@/platform/contract";

export type ScaleState = {
  /** Brain size, as a power of ten of numbers it learns. */
  brain: number;
  /** Reading, as a power of ten of word pieces. */
  reading: number;
  /** Computing budget, as a power of ten of arithmetic steps. */
  budget: number;
};

export type ScaleFrame = TimelineFrame &
  ScaleState & {
    /** Reading actually done, after the budget ran out (power of ten). */
    read: number;
    /** The whole budget was used. */
    spent: boolean;
    /** The best brain size for this budget (power of ten) and its surprise. */
    bestBrain: number;
    best: number;
  };

export const LIMITS = {
  brain: { min: 6, max: 12 },
  reading: { min: 8, max: 14 },
  budget: { min: 18, max: 25 },
} as const;
/** A brain this many powers of ten away from the best, with the budget spent, is lopsided. */
export const LOPSIDED = 1.5;

export const surprise = (brain: number, read: number) =>
  1.69 + 406.4 / 10 ** (0.34 * brain) + 410.7 / 10 ** (0.28 * read);

/** The reading the budget allows for a brain (power of ten). */
export const affordable = (brain: number, budget: number) => budget - Math.log10(6) - brain;

/** The best brain for a budget that is all spent, found by trying sizes a tenth of a power apart. */
export function bestFor(budget: number) {
  let best: { brain: number; loss: number } = { brain: LIMITS.brain.min, loss: Infinity };
  for (let brain = 3; brain <= 15; brain += 0.01) {
    const loss = surprise(brain, affordable(brain, budget));
    if (loss < best.loss) best = { brain, loss };
  }
  return best;
}

export function frameOf(state: ScaleState): Omit<ScaleFrame, "epoch"> {
  const allowed = affordable(state.brain, state.budget);
  const read = Math.min(state.reading, allowed);
  const best = bestFor(state.budget);
  const loss = surprise(state.brain, read);
  return {
    loss,
    ...state,
    read,
    spent: state.reading >= allowed,
    bestBrain: best.brain,
    best: best.loss,
  };
}

export const lopsided = (frame: Pick<ScaleFrame, "spent" | "brain" | "bestBrain">) =>
  frame.spent && Math.abs(frame.brain - frame.bestBrain) >= LOPSIDED;

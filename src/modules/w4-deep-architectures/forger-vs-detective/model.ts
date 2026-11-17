/**
 * Forger vs detective: a forger learns to make points on a plane look like the real ones (six
 * kinds of face, each at its own spot), while a detective learns to tell real from forged. When
 * the forger practises far more than the detective looks, it finds one spot the detective likes
 * and forges only that: it draws the same face every time.
 */
import { duel, SPOTS } from "@/engine/generative/gan";
import type { TimelineFrame } from "@/platform/contract";

export type DuelState = {
  /** "How fast the forger learns", 0–1 on the dial. */
  forger: number;
  /** "How fast the detective learns", 0–1 on the dial. */
  detective: number;
  /** "Forger tries per detective look", a whole number. */
  tries: number;
  /** Duels asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

export type DuelFrame = TimelineFrame & {
  key: string;
  rounds: number;
  /** Forged points, x and y in turn. */
  forged: number[];
  /** Share of forged points near each real face's spot. */
  shares: number[];
  /** How often the forger fooled the detective lately (0–1). */
  fooled: number;
  /** How often the detective was right lately (0–1). */
  caught: number;
  /** The biggest share of forged points bunched in one place (0–1). */
  bunched: number;
};

export const TRIES = { min: 1, max: 8 };
export const ROUNDS = 500;
const EVERY = 10;
const SEED = 1;
const RATE = { min: 0.001, max: 0.02 };
/** At least this share of the forger's points in one place: it draws the same face every time. */
export const ONE_FACE = 0.9;
/** Points closer than this to the bunch's middle count as the same face. */
const SAME = 0.2;

/** Step sizes grow faster than the dial, so its top is really fast. */
export const rateOf = (dial: number) =>
  RATE.min * (RATE.max / RATE.min) ** Math.min(1, Math.max(0, dial));

export const keyOf = ({ forger, detective, tries }: DuelState) => `${forger}|${detective}|${tries}`;

/** The share of points within SAME of their middle (the median point). */
export function bunching(forged: readonly number[]): number {
  const count = forged.length / 2;
  if (count === 0) return 0;
  const middle = (offset: number) => {
    const values = forged.filter((_, index) => index % 2 === offset).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 0;
  };
  const [mx, my] = [middle(0), middle(1)];
  let near = 0;
  for (let index = 0; index < forged.length; index += 2) {
    if (Math.hypot((forged[index] ?? 0) - mx, (forged[index + 1] ?? 0) - my) < SAME) near += 1;
  }
  return near / count;
}

/** Every moment of the duel `state` describes, the untrained pair first. */
export function* duelRun(state: DuelState): Generator<DuelFrame> {
  const key = keyOf(state);
  const settings = {
    forgerRate: rateOf(state.forger),
    detectiveRate: rateOf(state.detective),
    forgerTries: state.tries,
  };
  for (const moment of duel(settings, SEED, ROUNDS, EVERY)) {
    yield {
      epoch: moment.round,
      // The forger's mistakes: how often it did not fool the detective.
      loss: 1 - moment.fooled,
      key,
      rounds: ROUNDS,
      forged: moment.forged,
      shares: moment.shares,
      fooled: moment.fooled,
      caught: moment.caught,
      bunched: bunching(moment.forged),
    };
  }
}

export const isFinished = (state: DuelState, frame: DuelFrame | undefined): frame is DuelFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

/** How many of the six faces the forger draws (spots holding at least a twelfth of its points). */
export const facesOf = (frame: Pick<DuelFrame, "shares">) =>
  frame.shares.filter((share) => share >= 1 / 12).length;

export const SPOT_COUNT = SPOTS.length;

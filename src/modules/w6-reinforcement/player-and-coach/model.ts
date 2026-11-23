/**
 * Player and coach: actor-critic with PPO's clipped change (`engine/rl/ppo.ts`) on a little board,
 * trained in the agent worker. The dials pick the clip ("how small the changes stay") and the
 * study rounds per batch from a few fixed stops; the run is seeded, so the same dials and the same
 * number of batches always give the same moments.
 */
import type { AgentMoment, AgentRunConfig } from "@/engine/rl/agent-protocol";
import { LITTLE_BOARD } from "@/engine/rl/ppo";
import type { AgentPracticeState } from "@/features/rl/use-agent-practice";
import type { TimelineFrame } from "@/platform/contract";

export type CoachState = AgentPracticeState & {
  /** "How small the changes stay": a stop in `CLIP_STOPS`. */
  clip: number;
  /** "How many times it studies each batch": a stop in `ROUND_STOPS`. */
  rounds: number;
  /** "Start again" counts up, so the same dials can be watched again from the first batch. */
  attempt: number;
};

export type CoachFrame = TimelineFrame & {
  step: number;
  run: string;
  score: number;
  best: number;
  chances: number[];
  values: number[];
  walk: number[];
  change: number;
};

export const BOARD = LITTLE_BOARD;
/** How far one batch may move a move's chance (a share of it), by dial stop; the last has no rail. */
export const CLIP_STOPS = [0.1, 0.2, 0.5, Infinity] as const;
export const NO_RAIL = CLIP_STOPS.length - 1;
/** Study rounds per batch, by dial stop. */
export const ROUND_STOPS = [1, 2, 5, 10, 20, 40] as const;
export const MOST_ROUNDS = ROUND_STOPS.length - 1;
export const START = { clip: 1, rounds: 3 } as const;
/** Every run plays from this seed. */
export const SEED = 7;
/** Batches in a run. */
export const MOST_BATCHES = 40;
/** Batches a second while practising: the whole run takes twenty seconds to watch. */
export const BATCHES_PER_SECOND = 2;
/** The score line's fixed scale: from wandering into the lava to the best walk home. */
export const SCORE_RANGE = { min: -1.5, max: 1 } as const;
/**
 * What a random player earns per try, worked out exactly: about −1.00 (`randomScore`), pinned in
 * coach.test.tsx and ppo.test.ts.
 */
export const RANDOM_SCORE = -1;

/** A score this high means it had learned the way to the bowl (the best is about 0.71). */
export const ROSE = 0.5;
/** Falling this far below its best score is falling apart. */
export const FELL = 1;
/**
 * Measured with seed 7 over 40 batches, at every dial stop: with no rail and the most study rounds
 * the player passes `ROSE` at batch 3 (its best is 0.59), falls apart at batch 9 and ends at
 * −0.88. With either of the two smallest rails it never falls apart at any number of rounds and
 * ends between 0.54 (one study round) and 0.71. With no rail, 1 to 20 rounds learn and never
 * fall apart. Pinned in coach.test.tsx. Not pinned (too slow for a unit test), over seeds 1–12
 * with no rail and the most rounds: none ends above 0.6; six rise past 0.3 and then drop by more
 * than 0.8, six never rise. With the small rail and the most rounds, eleven of twelve end at 0.59
 * or more and none drops like that.
 */
export const fellApart = (frame: Pick<CoachFrame, "best" | "score">) =>
  frame.best >= ROSE && frame.score <= frame.best - FELL;

export const runOf = (state: Pick<CoachState, "clip" | "rounds" | "attempt">) =>
  `${state.clip}|${state.rounds}|${state.attempt}`;

export const clipOf = (stop: number) =>
  CLIP_STOPS[Math.min(NO_RAIL, Math.max(0, stop))] ?? Infinity;
export const roundsOf = (stop: number) =>
  ROUND_STOPS[Math.min(MOST_ROUNDS, Math.max(0, stop))] ?? 1;

export const configOf = (state: Pick<CoachState, "clip" | "rounds">): AgentRunConfig => ({
  kind: "board",
  world: BOARD,
  clip: clipOf(state.clip),
  rounds: roundsOf(state.rounds),
  seed: SEED,
});

export function frameOf(moment: AgentMoment, run: string): CoachFrame {
  if (moment.kind !== "board") throw new Error("A catching moment reached the board.");
  return {
    epoch: moment.step,
    step: moment.step,
    loss: moment.loss,
    run,
    score: moment.score,
    best: moment.best,
    chances: moment.chances,
    values: moment.values,
    walk: moment.walk,
    change: moment.change,
  };
}

/** The newest frame belongs to the run the dials ask for. */
export const isCurrent = (state: CoachState, frame: CoachFrame | undefined): frame is CoachFrame =>
  frame !== undefined && frame.run === runOf(state);

/** Each square's four move chances. */
export const chancesAt = (frame: Pick<CoachFrame, "chances">, cell: number) =>
  frame.chances.slice(cell * 4, cell * 4 + 4);

/**
 * A brain for the game: a deep Q-network (`engine/rl/dqn.ts`) learns Catch the fruit in the agent
 * worker. The dials pick its replay memory's size and its step size from a few fixed stops; the
 * run is seeded, so the same dials and the same number of games always give the same moments.
 */
import type { Drop } from "@/engine/rl/catch-game";
import type { AgentMoment, AgentRunConfig } from "@/engine/rl/agent-protocol";
import type { AgentPracticeState } from "@/features/rl/use-agent-practice";
import type { TimelineFrame } from "@/platform/contract";

export type CatchState = AgentPracticeState & {
  /** "How much it remembers": a stop in `MEMORY_STOPS`. */
  memory: number;
  /** "How fast it learns": a stop in `RATE_STOPS`. */
  learning: number;
  /** "Start again" counts up, so the same dials can be watched again from the first game. */
  attempt: number;
};

export type CatchFrame = TimelineFrame & {
  step: number;
  run: string;
  catches: number;
  caught: boolean[];
  sample: Drop[];
  sampleCaught: boolean;
};

/** Moves its replay memory holds, by dial stop: one move, one game (four moves) … 250 games. */
export const MEMORY_STOPS = [1, 4, 16, 64, 250, 1000] as const;
/** Adam's step size, by dial stop. */
export const RATE_STOPS = [0.003, 0.006, 0.01, 0.02, 0.03, 0.05] as const;
export const SMALLEST_MEMORY = 0;
export const START = { memory: MEMORY_STOPS.length - 1, learning: 3 } as const;
/** Every run plays from this seed. */
export const SEED = 1;
/** Practice games in a run. */
export const MOST_GAMES = 500;
/** Games a second while practising: the whole run takes twenty seconds to watch. */
export const GAMES_PER_SECOND = 25;
/** The 25 test drops: every fruit column with every basket start. */
export const TEST_DROPS = 25;
/** A basket moving at random catches one fruit in five (worked out exactly in catch-game.ts). */
export const RANDOM_CATCHES = 5;
/**
 * Catching this many of the 25 test drops is "nearly every fruit". Measured with seed 1 over 500
 * games, at every moment (every 20 games): with a memory of one move, one game or four games, no
 * step size ever reaches it (the most is 18 of 25) and every run ends on 3 to 15. With the biggest
 * memory, every step size from the starting stop up reaches it by game 220 and ends on 23 to 25
 * (25 at the starting dials, from game 200). Pinned in catch.test.tsx.
 */
export const GOOD_CATCHES = 20;

export const runOf = (state: Pick<CatchState, "memory" | "learning" | "attempt">) =>
  `${state.memory}|${state.learning}|${state.attempt}`;

export const memoryOf = (stop: number) =>
  MEMORY_STOPS[Math.min(MEMORY_STOPS.length - 1, Math.max(0, stop))] ?? 1;
export const rateOf = (stop: number) =>
  RATE_STOPS[Math.min(RATE_STOPS.length - 1, Math.max(0, stop))] ?? 0.02;

export const configOf = (state: Pick<CatchState, "memory" | "learning">): AgentRunConfig => ({
  kind: "catch",
  memory: memoryOf(state.memory),
  learningRate: rateOf(state.learning),
  seed: SEED,
});

export function frameOf(moment: AgentMoment, run: string): CatchFrame {
  if (moment.kind !== "catch") throw new Error("A board moment reached the catching game.");
  return {
    epoch: moment.step,
    step: moment.step,
    loss: moment.loss,
    run,
    catches: moment.catches,
    caught: moment.caught,
    sample: moment.sample,
    sampleCaught: moment.sampleCaught,
  };
}

/** The newest frame belongs to the run the dials ask for. */
export const isCurrent = (state: CatchState, frame: CatchFrame | undefined): frame is CatchFrame =>
  frame !== undefined && frame.run === runOf(state);

/** The run is over and it still misses lots: practice stalled. */
export const stalled = (frame: Pick<CatchFrame, "step" | "catches">) =>
  frame.step >= MOST_GAMES && frame.catches < GOOD_CATCHES;

/**
 * New or favourite?: five slot machines, each paying out with its own hidden chance. You play
 * them yourself (each pull's outcome is fixed by the machine's tape and its pull number, so a link
 * replays your pulls), then two bots race on them: "Curious sometimes" (epsilon-greedy, its
 * curiosity on the dial) and "Hopeful about the unknown" (UCB1). The race is worked out whole and
 * recorded, one frame per ten pulls.
 */
import {
  bestIndex,
  createBanditPlayer,
  pays,
  playMachines,
  shuffled,
  type BanditPlayerKind,
} from "@/engine/rl/bandit";
import type { TimelineFrame } from "@/platform/contract";

export const MACHINES = ["star", "moon", "heart", "bell", "leaf"] as const;
export type Machine = (typeof MACHINES)[number];

/** The casino: which hidden chances, in which order (also the bots' tape). */
export const CASINO = 7;
/** Hidden win chances, spread so the best is clearly best: shuffled to [0.55, 0.35, 0.45, 0.7, 0.2]. */
export const CHANCES = shuffled([0.2, 0.35, 0.45, 0.55, 0.7], CASINO);
/** The Bell machine. */
export const BEST = bestIndex(CHANCES);
/** The bots' own randomness (curiosity and tie-breaks). */
export const BOT_SEED = 3;
/** Your own pulls per game. */
export const YOUR_PULLS = 30;
/** Your pulls come from their own tapes, a fresh one per game. */
const YOUR_TAPE = 1000;

/** "How curious": the chance of trying a random machine instead of its favourite. */
export const CURIOUS = { min: 0, max: 0.5, start: 0.1 } as const;
/** Below this the curious bot never tries anything new. */
export const NEVER = 0.005;
/** "How many pulls" the bots get. */
export const BUDGET = { min: 50, max: 1000, step: 50, start: 300 } as const;
/** Pulls per recorded frame. */
export const EVERY = 10;

/**
 * Sticking: at least this share of its pulls on one machine. Measured (casino.test.tsx pins it):
 * with no curiosity the curious bot (seed 3) misses twice, wins on its third pull at the Heart
 * machine (chance 0.45) and then pulls nothing else (96% of its pulls at a budget of 50, more
 * after), for every budget from 50 to 1000; the hopeful bot ends at least 25% ahead of it at
 * every one of those budgets.
 */
export const STUCK = 0.9;

export type CasinoState = {
  /** Your pulls this game: which machine, in order. */
  pulls: number[];
  /** Games of yours started; each has its own outcomes. */
  plays: number;
  /** "How curious", CURIOUS.min–max. */
  curious: number;
  /** "How many pulls" each bot gets. */
  budget: number;
  /** Races asked for; 0 until the first. A link replays the last one. */
  races: number;
};

export type BotRun = { wins: number; counts: number[] };

export type RaceFrame = TimelineFrame & {
  key: string;
  budget: number;
  /** "Curious sometimes", then "Hopeful about the unknown". */
  bots: [BotRun, BotRun];
};

export const keyOf = ({ curious, budget }: Pick<CasinoState, "curious" | "budget">) =>
  `${curious}|${budget}`;

/** Your pulls with their outcomes: the j-th pull of a machine reads that machine's tape at j. */
export function yourResults({ pulls, plays }: Pick<CasinoState, "pulls" | "plays">) {
  const seen = MACHINES.map(() => 0);
  return pulls.map((machine) => {
    const pull = seen[machine] ?? 0;
    seen[machine] = pull + 1;
    return { machine, won: pays(CHANCES[machine] ?? 0, YOUR_TAPE + plays, machine, pull) };
  });
}

const BOTS: [(state: CasinoState) => BanditPlayerKind, (state: CasinoState) => BanditPlayerKind] = [
  ({ curious }) => ({ kind: "curious", curiosity: curious }),
  () => ({ kind: "hopeful" }),
];

/** Every moment of the race `state` describes, the start first, then one per EVERY pulls. */
export function* raceRun(state: CasinoState): Generator<RaceFrame> {
  const key = keyOf(state);
  const runs = BOTS.map((kind) => {
    const player = createBanditPlayer(kind(state), MACHINES.length, BOT_SEED);
    return { player, pulls: playMachines(player, CHANCES, CASINO, state.budget), wins: 0 };
  });
  const frameAt = (pulled: number): RaceFrame => {
    const bots = runs.map(({ player, wins }) => ({ wins, counts: [...player.counts] }));
    const [curious, hopeful] = bots as [BotRun, BotRun];
    return {
      epoch: pulled,
      // The curious bot's misses so far, as a share.
      loss: pulled === 0 ? 1 : 1 - curious.wins / pulled,
      key,
      budget: state.budget,
      bots: [curious, hopeful],
    };
  };
  yield frameAt(0);
  for (let pulled = 1; pulled <= state.budget; pulled += 1) {
    for (const run of runs) if (run.pulls.next().value?.won) run.wins += 1;
    if (pulled % EVERY === 0 || pulled === state.budget) yield frameAt(pulled);
  }
}

export const isFinished = (state: CasinoState, frame: RaceFrame | undefined): frame is RaceFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.budget;

/** The machine a bot pulled most, and its share of the pulls so far. */
export function favouriteOf({ counts }: BotRun) {
  const machine = bestIndex(counts);
  const total = counts.reduce((sum, pulls) => sum + pulls, 0);
  return { machine, share: total === 0 ? 0 : (counts[machine] ?? 0) / total };
}

/** The curious bot stuck with one machine that is not the best. */
export function stuckOnWorse(frame: RaceFrame): boolean {
  const { machine, share } = favouriteOf(frame.bots[0]);
  return machine !== BEST && share >= STUCK;
}

/** Wins a player picking at random would expect after `pulls` pulls. */
export const randomWins = (pulls: number) =>
  (pulls * CHANCES.reduce((sum, chance) => sum + chance, 0)) / CHANCES.length;

/** The most wins anyone could expect after `pulls` pulls (always the best machine). */
export const bestWins = (pulls: number) => pulls * (CHANCES[BEST] ?? 0);

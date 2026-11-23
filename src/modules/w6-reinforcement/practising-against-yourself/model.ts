/**
 * Practising against yourself: two copies of one beginner, Pip and Pop, learn the stick game by
 * playing each other (`engine/rl/sticks.ts`). Every so often Pip is tested against a newcomer
 * who plays well. Frozen, Pop never learns, and Pip learns a cheap trick that beats Pop's habits
 * but not the newcomer. A run is a pure function of the dials and the seed, so a link replays it.
 */
import {
  createPractice,
  favouriteTake,
  knownPiles,
  PILE,
  sharpTester,
  testAgainst,
  type Game,
  type Habits,
} from "@/engine/rl/sticks";
import type { TimelineFrame } from "@/platform/contract";

export type PracticeState = {
  /** "How many practice games": a step of `GAMES`. */
  games: number;
  /** "How curious", 0–1: the chance of a random move instead of a habit. */
  curiosity: number;
  /** Pop never learns. */
  frozen: boolean;
  /** Practice runs asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

/** Practice games at each step of its dial. */
export const GAMES = [50, 100, 200, 500, 1000, 2000, 4000] as const;
export const DEFAULT_GAMES = 4;
export const DEFAULT_CURIOSITY = 0.2;
const SEED = 1;
/** Pip's wins against Pop are counted over this many of their newest games. */
export const RECENT = 200;
/** Test games against the newcomer at every frame (Pip moves first, never curious). */
export const TEST_GAMES = 10;
const TEST_SEED = 9;
/** Frames recorded per run after the first (games between frames: the run's games / this). */
const FRAMES = 50;

/**
 * The mission's bars. Measured at the default dials, frozen: Pip wins 98 in 100 of its newest
 * games against Pop but none of the 10 against the newcomer; at a thousand games every curiosity
 * from 0 to 0.45 keeps at least 81 in 100 against Pop and at most 1 in 10 against the newcomer.
 * Not frozen, at the default dials it wins 56 in 100 against Pop and all 10 test games.
 * Pinned in `practice.test.tsx`.
 */
export const BEATS_PARTNER = 0.8;
export const LOSES_TO_NEWCOMER = 0.3;
/**
 * The guess: copies that both learn trade wins, Pip winning between these shares of their
 * newest games. Measured at every curiosity step (0 to 1 by 0.05) from a thousand games up:
 * 0.42–0.59.
 */
export const EVEN = { low: 0.35, high: 0.65 };

export type PracticeFrame = TimelineFrame & {
  key: string;
  /** Practice games the run will play. */
  total: number;
  /** Pip's share of its newest games against Pop (null before any). */
  pipShare: number | null;
  /** Pip's share of the test games against the newcomer. */
  testShare: number;
  /** Each player's favourite take from 1, 2, … `PILE` sticks. */
  pip: number[];
  pop: number[];
  /** Piles from which each already makes the move a perfect player would. */
  pipKnows: number;
  popKnows: number;
  /** Their newest practice game. */
  last: Game | null;
};

export const gamesOf = (state: Pick<PracticeState, "games">) =>
  GAMES[state.games] ?? GAMES[DEFAULT_GAMES];

export const keyOf = ({ games, curiosity, frozen }: PracticeState) =>
  `${games}|${curiosity}|${frozen ? 1 : 0}`;

const favourites = (habits: Habits) =>
  Array.from({ length: PILE }, (_, at) => favouriteTake(habits, at + 1));

const shareOf = (winners: readonly (0 | 1)[]) => {
  const recent = winners.slice(-RECENT);
  return recent.length === 0
    ? null
    : recent.filter((winner) => winner === 0).length / recent.length;
};

/** Every moment of the practice `state` describes, before any game first. */
export function* practiceRun(state: PracticeState): Generator<PracticeFrame> {
  const key = keyOf(state);
  const total = gamesOf(state);
  const practice = createPractice(
    { games: total, curiosity: state.curiosity, frozen: state.frozen },
    SEED,
  );
  const every = Math.max(1, Math.round(total / FRAMES));
  for (;;) {
    const [pip, pop] = practice.players;
    const pipShare = shareOf(practice.winners);
    yield {
      epoch: practice.played,
      loss: 1 - (pipShare ?? 0.5),
      key,
      total,
      pipShare,
      testShare: testAgainst(pip, sharpTester, TEST_GAMES, TEST_SEED),
      pip: favourites(pip),
      pop: favourites(pop),
      pipKnows: knownPiles(pip).length,
      popKnows: knownPiles(pop).length,
      last: practice.last,
    };
    if (practice.advance(every) === 0) return;
  }
}

export const isFinished = (
  state: PracticeState,
  frame: PracticeFrame | undefined,
): frame is PracticeFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.total;

/** The mission: frozen, Pip beats Pop nearly always yet loses to the newcomer. */
export const learnedACheapTrick = (state: PracticeState, frame: PracticeFrame | undefined) =>
  state.frozen &&
  isFinished(state, frame) &&
  (frame.pipShare ?? 0) >= BEATS_PARTNER &&
  frame.testShare <= LOSES_TO_NEWCOMER;

/** The moment before any practice game: the habits they start with. */
export const startOf = (state: PracticeState): PracticeFrame =>
  practiceRun(state).next().value as PracticeFrame;

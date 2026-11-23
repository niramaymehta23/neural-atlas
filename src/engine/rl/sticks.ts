/**
 * The stick game and two players who learn it by playing each other (self-play). A pile of
 * sticks sits on the table; in turn each player takes one, two or three; whoever takes the last
 * stick wins. (The secret: leave your opponent a multiple of four.)
 *
 * Each player keeps a habit score for every move from every pile size, all near zero at first
 * (a little seeded noise, so each copy starts with its own quirks). It plays its best-scored
 * move, except that now and then, as curious as the setting says, it tries a random one. After
 * each game every move a player made is nudged towards +1 if that player won and −1 if it lost
 * (a running average of how its games went: Monte Carlo learning). A frozen player never nudges.
 * Seeded: the same settings and seed play the same practice games.
 */
import { createRandom, type Random } from "../random";

/** Sticks on the table at the start of every game. */
export const PILE = 21;
/** The most sticks one turn may take. */
export const MOST_TAKE = 3;
/** How far one game moves a habit score towards its result. */
export const LEARN_RATE = 0.1;
/** Starting habit scores are within this much of zero. */
const QUIRK = 0.01;

/** A player's habit scores: `scores[sticks * MOST_TAKE + take - 1]` for every pile size. */
export type Habits = Float64Array;

export type PracticeSettings = {
  /** Practice games to play. */
  games: number;
  /** Chance of a random move instead of the habit, 0–1. */
  curiosity: number;
  /** True: the partner never learns; it plays its starting habits every game. */
  frozen: boolean;
};

/** A new player's habits: near zero, with its own seeded quirks. */
export function freshHabits(seed: number): Habits {
  const random = createRandom(seed);
  const scores = new Float64Array((PILE + 1) * MOST_TAKE);
  for (let index = 0; index < scores.length; index += 1)
    scores[index] = (random.next() * 2 - 1) * QUIRK;
  return scores;
}

/** Moves allowed with `sticks` left: take one, two or three, but never more than there are. */
export const takesFrom = (sticks: number) => Math.min(MOST_TAKE, Math.max(0, sticks));

/** The move its habits score best with `sticks` left (ties go to taking fewer). */
export function favouriteTake(habits: Habits, sticks: number): number {
  let best = 1;
  let bestScore = -Infinity;
  for (let take = 1; take <= takesFrom(sticks); take += 1) {
    const score = habits[sticks * MOST_TAKE + take - 1] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = take;
    }
  }
  return best;
}

/** Its move: its favourite, or with chance `curiosity` a random one. */
export function chooseTake(habits: Habits, sticks: number, curiosity: number, random: Random) {
  // Always draw, so the random stream does not depend on which branch was taken.
  const roll = random.next();
  const pick = 1 + random.int(takesFrom(sticks));
  return roll < curiosity ? pick : favouriteTake(habits, sticks);
}

/** The move that leaves a multiple of four, or null when there is none (a losing pile). */
export const winningTake = (sticks: number): number | null =>
  sticks % (MOST_TAKE + 1) === 0 ? null : sticks % (MOST_TAKE + 1);

export type Move = { sticks: number; take: number };
/** One game: who started (0 or 1), every move in order, and who won (0 or 1). */
export type Game = { first: 0 | 1; moves: Move[]; winner: 0 | 1 };

/** Plays one game between two move pickers, `first` moving first. */
export function playGame(
  pick: readonly [(sticks: number) => number, (sticks: number) => number],
  first: 0 | 1,
): Game {
  const moves: Move[] = [];
  let sticks = PILE;
  let turn = first;
  for (;;) {
    const take = Math.min(sticks, Math.max(1, pick[turn](sticks)));
    moves.push({ sticks, take });
    sticks -= take;
    if (sticks === 0) return { first, moves, winner: turn };
    turn = turn === 0 ? 1 : 0;
  }
}

/** Nudges `player`'s habits for the moves it made in `game` towards how the game ended. */
export function learnFrom(habits: Habits, game: Game, player: 0 | 1, rate = LEARN_RATE) {
  const result = game.winner === player ? 1 : -1;
  game.moves.forEach((move, index) => {
    const mover = index % 2 === 0 ? game.first : game.first === 0 ? 1 : 0;
    if (mover !== player) return;
    const at = move.sticks * MOST_TAKE + move.take - 1;
    habits[at] = (habits[at] ?? 0) + rate * (result - (habits[at] ?? 0));
  });
}

/** Share of `count` test games `habits` (moving first, never curious) wins against `tester`. */
export function testAgainst(
  habits: Habits,
  tester: (sticks: number, random: Random) => number,
  count: number,
  seed: number,
): number {
  const random = createRandom(seed);
  let won = 0;
  for (let game = 0; game < count; game += 1) {
    const played = playGame(
      [(sticks) => favouriteTake(habits, sticks), (sticks) => tester(sticks, random)],
      0,
    );
    if (played.winner === 0) won += 1;
  }
  return count > 0 ? won / count : 0;
}

/** A newcomer who just takes any number of sticks. */
export const randomTester = (sticks: number, random: Random) => 1 + random.int(takesFrom(sticks));

/** A newcomer who knows the secret: it leaves a multiple of four when it can, else takes any. */
export const sharpTester = (sticks: number, random: Random) => {
  const pick = 1 + random.int(takesFrom(sticks));
  return winningTake(sticks) ?? pick;
};

export type Practice = {
  /** The learner (Pip) and its partner (Pop). */
  players: [Habits, Habits];
  /** Practice games played so far. */
  played: number;
  /** The winner of every game so far, oldest first. */
  winners: (0 | 1)[];
  /** The last game played. */
  last: Game | null;
  /** Plays up to `count` more practice games (never past `settings.games`). */
  advance(count: number): number;
};

/**
 * Two copies practising against each other. Games alternate who starts. Both learn from every
 * game, unless `frozen`, when the partner keeps its starting habits (and plays them without
 * curiosity: it is a recording of itself).
 */
export function createPractice(settings: PracticeSettings, seed: number): Practice {
  const random = createRandom(seed);
  const players: [Habits, Habits] = [freshHabits(seed * 2 + 1), freshHabits(seed * 2 + 2)];
  const total = Math.max(0, Math.floor(settings.games));
  const curiosity = Math.min(1, Math.max(0, settings.curiosity));
  const practice: Practice = {
    players,
    played: 0,
    winners: [],
    last: null,
    advance(count) {
      let played = 0;
      while (practice.played < total && played < count) {
        const partnerCuriosity = settings.frozen ? 0 : curiosity;
        const game = playGame(
          [
            (sticks) => chooseTake(players[0], sticks, curiosity, random),
            (sticks) => chooseTake(players[1], sticks, partnerCuriosity, random),
          ],
          practice.played % 2 === 0 ? 0 : 1,
        );
        learnFrom(players[0], game, 0);
        if (!settings.frozen) learnFrom(players[1], game, 1);
        practice.winners.push(game.winner);
        practice.last = game;
        practice.played += 1;
        played += 1;
      }
      return played;
    },
  };
  return practice;
}

/** Pile sizes from which `habits` already makes the move that leaves a multiple of four. */
export function knownPiles(habits: Habits): number[] {
  const known: number[] = [];
  for (let sticks = 1; sticks <= PILE; sticks += 1) {
    const best = winningTake(sticks);
    if (best !== null && favouriteTake(habits, sticks) === best) known.push(sticks);
  }
  return known;
}

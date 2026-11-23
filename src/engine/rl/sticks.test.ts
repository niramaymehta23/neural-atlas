import { createRandom } from "../random";
import {
  chooseTake,
  createPractice,
  favouriteTake,
  freshHabits,
  knownPiles,
  learnFrom,
  PILE,
  playGame,
  randomTester,
  sharpTester,
  testAgainst,
  winningTake,
  type PracticeSettings,
} from "./sticks";

const practised = (settings: PracticeSettings, seed: number) => {
  const practice = createPractice(settings, seed);
  practice.advance(settings.games);
  return practice;
};
/** The learner's share of the last `count` practice games. */
const lately = (winners: readonly (0 | 1)[], count = 200) => {
  const recent = winners.slice(-count);
  return recent.filter((winner) => winner === 0).length / recent.length;
};

describe("the stick game", () => {
  it("ends when the last stick is taken, by whoever took it", () => {
    const game = playGame([() => 3, () => 3], 0);
    expect(game.moves.reduce((sum, move) => sum + move.take, 0)).toBe(PILE);
    // 21 = 3 × 7: seven takes of three, the first player takes the 1st, 3rd, 5th and 7th.
    expect(game.winner).toBe(0);
    // A take is never more than what is left.
    const greedy = playGame([() => 3, () => 2], 1);
    expect(greedy.moves.at(-1)?.take).toBeLessThanOrEqual(greedy.moves.at(-1)?.sticks ?? 0);
  });

  it("knows the secret move: leave a multiple of four", () => {
    expect(winningTake(21)).toBe(1);
    expect(winningTake(7)).toBe(3);
    expect(winningTake(8)).toBeNull();
    expect(sharpTester(10, createRandom(1))).toBe(2);
  });

  it("nudges only the winner's moves up and the loser's down", () => {
    const habits = freshHabits(1);
    const game = playGame([() => 1, () => 3], 0);
    const before = habits[PILE * 3 + 0] ?? 0;
    learnFrom(habits, game, game.winner === 0 ? 0 : 1);
    expect(habits[PILE * 3 + 0]).not.toBe(before);
    const other = freshHabits(2);
    learnFrom(other, { first: 0, moves: [{ sticks: 3, take: 3 }], winner: 0 }, 0);
    expect(favouriteTake(other, 3)).toBe(3);
  });

  it("is curious as often as asked, and otherwise plays its favourite", () => {
    const habits = freshHabits(3);
    const random = createRandom(4);
    const favourite = favouriteTake(habits, 10);
    const takes = Array.from({ length: 400 }, () => chooseTake(habits, 10, 0, random));
    expect(takes.every((take) => take === favourite)).toBe(true);
    const curious = Array.from({ length: 400 }, () => chooseTake(habits, 10, 1, random));
    expect(new Set(curious).size).toBe(3);
  });

  it("practises the same games for the same seed, however they are chunked", () => {
    const settings = { games: 300, curiosity: 0.2, frozen: false };
    const whole = practised(settings, 5);
    const chunked = createPractice(settings, 5);
    while (chunked.advance(7) > 0);
    expect(chunked.played).toBe(300);
    expect(chunked.winners).toEqual(whole.winners);
    expect(Array.from(chunked.players[0])).toEqual(Array.from(whole.players[0]));
  });
});

describe("practising against yourself (self-play)", () => {
  it("self-play (seed 1, 1000 practice games) beats a random player in at least 90% of 200 games", () => {
    // Measured: 200 of 200; a random player against a random player wins about half.
    const { players } = practised({ games: 1000, curiosity: 0.2, frozen: false }, 1);
    expect(testAgainst(players[0], randomTester, 200, 9)).toBeGreaterThanOrEqual(0.9);
    expect(testAgainst(freshHabits(99), randomTester, 200, 9)).toBeLessThan(0.75);
  });

  it("two copies trading wins both learn the secret move from every pile (seed 1, 1000 games)", () => {
    const { players, winners } = practised({ games: 1000, curiosity: 0.2, frozen: false }, 1);
    // Measured: both know all sixteen piles where a winning move exists.
    expect(knownPiles(players[0])).toHaveLength(16);
    expect(knownPiles(players[1])).toHaveLength(16);
    expect(lately(winners)).toBeGreaterThan(0.35);
    expect(lately(winners)).toBeLessThan(0.65);
    // Moving first from 21, it beats even a newcomer who knows the secret.
    expect(testAgainst(players[0], sharpTester, 50, 9)).toBe(1);
  });

  it("against a frozen partner it learns a cheap trick (seed 1, 1000 games)", () => {
    const { players, winners } = practised({ games: 1000, curiosity: 0.2, frozen: true }, 1);
    // Measured: it wins 93 in 100 of its last practice games, knows the secret from only ten of
    // the sixteen piles, and loses every test game to the newcomer.
    expect(lately(winners)).toBeGreaterThanOrEqual(0.9);
    expect(knownPiles(players[0]).length).toBeLessThanOrEqual(10);
    expect(testAgainst(players[0], sharpTester, 50, 9)).toBeLessThanOrEqual(0.1);
    // The frozen partner never changed.
    expect(Array.from(players[1])).toEqual(Array.from(freshHabits(1 * 2 + 2)));
  });
});

/**
 * What the machine sees: houses described by a few facts, and a price guesser that only knows
 * the facts it is told. It finds the best weight for each told fact in one go (least squares)
 * from the houses it learns from, then guesses the price of new houses. Pure: the same state
 * always gives the same houses, weights and guesses.
 */
import { leastSquares } from "@/engine/fit/least-squares";
import { createRandom } from "@/engine/random";

export const FACTS = ["size", "rooms", "garden", "distance", "door"] as const;
export type Fact = (typeof FACTS)[number];

export type SeesState = {
  /** Whether the guesser is told each fact, in FACTS order. */
  told: boolean[];
  /** "How many houses it learns from", 0–1 on the dial. */
  houses: number;
  /** "How much prices jump about", 0–1 on the dial. */
  jumpy: number;
  /** How many times the learner has told or hidden a fact. */
  changes: number;
};

/** A house: its facts (0–1 each, in FACTS order) and its real price. */
export type House = { facts: number[]; price: number };

export const LEARN = { min: 4, max: 40 };
/** New houses it guesses, drawn as bars. */
export const NEW_HOUSES = 5;
/** Misses (as a share of the price range) below these read "close" and "a little off". */
export const CLOSE = 0.06;
export const LITTLE = 0.12;
/** How much each fact really adds to the price; the door's colour adds nothing. */
const TRUE_WEIGHTS: Record<Fact, number> = {
  size: 4,
  rooms: 0.6,
  garden: 0.5,
  distance: -0.9,
  door: 0,
};
const BASE = 1;
const SEED = { learn: 41, test: 99 };

export const learnCount = (dial: number) =>
  Math.round(LEARN.min + Math.min(1, Math.max(0, dial)) * (LEARN.max - LEARN.min));

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** Seeded houses. Bigger houses tend to have more rooms, so rooms hint at size a little. */
function build(seed: number, total: number, jumpy: number): House[] {
  const random = createRandom(seed);
  return Array.from({ length: total }, () => {
    const size = random.next();
    const facts = [
      size,
      Math.min(1, Math.max(0, 0.3 * size + 0.7 * random.next())),
      random.next(),
      random.next(),
      random.next(),
    ].map(round3);
    const jump = random.normal() * jumpy * 0.6;
    const price = FACTS.reduce(
      (sum, fact, index) => sum + TRUE_WEIGHTS[fact] * (facts[index] ?? 0),
      BASE,
    );
    return { facts, price: round3(price + jump) };
  });
}

export const learningHouses = ({ houses, jumpy }: Pick<SeesState, "houses" | "jumpy">) =>
  build(SEED.learn, LEARN.max, jumpy).slice(0, learnCount(houses));

export const newHouses = ({ jumpy }: Pick<SeesState, "jumpy">) =>
  build(SEED.test, NEW_HOUSES, jumpy);

/** The weight the guesser gives each fact (0 for facts it is not told), and its starting amount. */
export function fit(state: Pick<SeesState, "told" | "houses" | "jumpy">) {
  const used = FACTS.flatMap((_, index) => (state.told[index] ? [index] : []));
  const rows = learningHouses(state);
  const solved = leastSquares(
    rows.map(({ facts }) => [1, ...used.map((index) => facts[index] ?? 0)]),
    rows.map(({ price }) => price),
    1e-3,
  );
  const weights = FACTS.map(() => 0);
  used.forEach((index, at) => (weights[index] = solved[at + 1] ?? 0));
  return { start: solved[0] ?? 0, weights };
}

/** The guesser's price for each new house. */
export function guesses(state: Pick<SeesState, "told" | "houses" | "jumpy">): number[] {
  const { start, weights } = fit(state);
  return newHouses(state).map(({ facts }) =>
    weights.reduce((sum, weight, index) => sum + weight * (facts[index] ?? 0), start),
  );
}

/** The price range drawn: misses are judged as a share of it. */
export const PRICE_SPAN = 5;

/** Each new house's miss as a share of the price range. */
export function misses(state: Pick<SeesState, "told" | "houses" | "jumpy">): number[] {
  const real = newHouses(state);
  return guesses(state).map(
    (guess, index) => Math.abs(guess - (real[index]?.price ?? 0)) / PRICE_SPAN,
  );
}

export const averageMiss = (state: Pick<SeesState, "told" | "houses" | "jumpy">) => {
  const all = misses(state);
  return all.reduce((sum, miss) => sum + miss, 0) / all.length;
};

export type Closeness = "close" | "little" | "far";
export const closeness = (miss: number): Closeness =>
  miss < CLOSE ? "close" : miss < LITTLE ? "little" : "far";

/** The fact the full model leans on most: the one the guess cannot do without. */
export function mostImportant(): Fact {
  const { weights } = fit({ told: FACTS.map(() => true), houses: 1, jumpy: 0 });
  let best = 0;
  weights.forEach((weight, index) => {
    if (Math.abs(weight) > Math.abs(weights[best] ?? 0)) best = index;
  });
  return FACTS[best] ?? "size";
}

/** Hiding size counts as breaking it when guesses are at least this much worse than with every fact. */
const WORSE = 2;

/** True when size is hidden and that alone sends the guesses far off. */
export function sizeHiddenHurts(state: SeesState): boolean {
  if (state.told[0]) return false;
  const miss = averageMiss(state);
  const full = averageMiss({ ...state, told: FACTS.map(() => true) });
  return miss >= LITTLE && miss >= WORSE * full;
}

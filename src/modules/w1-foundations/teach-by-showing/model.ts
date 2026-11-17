/**
 * Teach by showing: the learner sorts fruit into two baskets, and a little robot copies them.
 * Each fruit is just two facts the robot can see (how round, how red). The robot remembers the
 * average fruit of each basket and puts every new fruit in the basket whose average is nearest.
 * Everything is a pure function of state, so a shared link shows the same fruit and result.
 */
import { createRandom } from "@/engine/random";
import type { TimelineFrame } from "@/platform/contract";

/** 0 = apple, 1 = pear: the true kind, drawn as the fruit's shape. */
export type Kind = 0 | 1;
export type Fruit = { round: number; red: number; kind: Kind };

export type TeachState = {
  /** "How many fruit you show it", 0–1 on the dial. */
  show: number;
  /** "How messy the fruit is", 0–1 on the dial. */
  messy: number;
  /** The basket the learner put each shown fruit in (0 apples, 1 pears), in showing order. */
  baskets: Kind[];
  /** How many times the robot has been asked to sort; 0 until the first. */
  runs: number;
};

/** The robot's try, recorded so a guess placed after watching waits for the next try. */
export type TeachFrame = TimelineFrame & { key: string; right: number };

export const SHOWN = { min: 2, max: 12 };
/** New fruit the robot sorts on each try. */
export const NEW_FRUIT = 10;
/** The robot doing this badly or worse counts as having learned the wrong thing. */
export const LOW_SCORE = 6;
const CENTRES: Record<Kind, { round: number; red: number }> = {
  0: { round: 0.75, red: 0.72 },
  1: { round: 0.32, red: 0.3 },
};
const SEED = { teach: 21, test: 87 };

export const shownCount = (dial: number) =>
  Math.round(SHOWN.min + Math.min(1, Math.max(0, dial)) * (SHOWN.max - SHOWN.min));

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** A seeded basket of fruit, apples and pears taking turns, messier as the dial turns up. */
function grow(seed: number, total: number, messy: number): Fruit[] {
  const random = createRandom(seed);
  const spread = 0.05 + messy * 0.3;
  return Array.from({ length: total }, (_, index) => {
    // The same draws for every dial position, so turning the dial only spreads the fruit out.
    const kind: Kind = index % 2 === 0 ? 0 : 1;
    const centre = CENTRES[kind];
    const clamp = (value: number) => round3(Math.min(1, Math.max(0, value)));
    return {
      kind,
      round: clamp(centre.round + random.normal() * spread),
      red: clamp(centre.red + random.normal() * spread),
    };
  });
}

/** The fruit the learner sorts, in showing order. */
export const teachingFruit = ({ show, messy }: Pick<TeachState, "show" | "messy">) =>
  grow(SEED.teach, SHOWN.max, messy).slice(0, shownCount(show));

/** The fresh fruit the robot is tested on. */
export const newFruit = ({ messy }: Pick<TeachState, "messy">) => grow(SEED.test, NEW_FRUIT, messy);

/** True once every shown fruit is in a basket. */
export const allSorted = (state: TeachState) => state.baskets.length >= teachingFruit(state).length;

/** How many fruit the learner put in the wrong basket. */
export const wrongLabels = (state: TeachState) =>
  teachingFruit(state).filter((fruit, index) => {
    const basket = state.baskets[index];
    return basket !== undefined && basket !== fruit.kind;
  }).length;

/** Where the robot puts each new fruit: the basket whose average fruit is nearest. */
export function robotSorts(state: TeachState): Kind[] {
  const shown = teachingFruit(state);
  const averages = ([0, 1] as const).map((basket) => {
    const members = shown.filter((_, index) => state.baskets[index] === basket);
    if (members.length === 0) return null;
    return {
      round: members.reduce((sum, fruit) => sum + fruit.round, 0) / members.length,
      red: members.reduce((sum, fruit) => sum + fruit.red, 0) / members.length,
    };
  });
  return newFruit(state).map((fruit) => {
    const [apples, pears] = averages;
    if (!apples) return 1;
    if (!pears) return 0;
    const far = (to: { round: number; red: number }) =>
      Math.hypot(fruit.round - to.round, fruit.red - to.red);
    return far(apples) <= far(pears) ? 0 : 1;
  });
}

/** How many new fruit the robot sorted right. */
export const robotScore = (state: TeachState) => {
  const fresh = newFruit(state);
  return robotSorts(state).filter((basket, index) => basket === fresh[index]?.kind).length;
};

/** The sorting the robot's try is for: dials and baskets, as one string. */
export const keyOf = ({ show, messy, baskets }: TeachState) =>
  `${shownCount(show)}|${messy}|${baskets.join("")}`;

/** The robot's try for this state, as a recorded moment. */
export const robotFrame = (state: TeachState): TeachFrame => {
  const right = robotScore(state);
  return { epoch: 0, loss: 1 - right / NEW_FRUIT, key: keyOf(state), right };
};

/** True when the newest try was made on the sorting on screen now. */
export const isCurrent = (state: TeachState, frame: TeachFrame | undefined): frame is TeachFrame =>
  state.runs > 0 && frame !== undefined && frame.key === keyOf(state) && allSorted(state);

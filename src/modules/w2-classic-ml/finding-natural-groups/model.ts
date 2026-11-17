import type { Point } from "@/data/datasets";
import { groupSteps, type GroupStep, type Spot } from "@/engine/ml/kmeans";
import { createRandom } from "@/engine/random";
import { rememberLast } from "@/features/classic/memo";
import type { TimelineFrame } from "@/platform/contract";

export const PILES = ["two", "three", "rings"] as const;
export type Piles = (typeof PILES)[number];
/** How many groups each set of dots really has. */
export const NATURAL: Record<Piles, number> = { two: 2, three: 3, rings: 2 };
export const LIMITS = { magnets: { min: 1, max: 3 }, attempt: { min: 0, max: 999 } };
/** The most moves a run takes; real runs settle long before. */
export const MOST_MOVES = 30;
const DOTS = 150;
/** Runs tried for the guess, each with magnets dropped somewhere new. */
export const TRIES = 20;
/** Found groups this close to the real piles count as the piles. */
const MATCH = 0.9;

export type GroupsState = {
  piles: Piles;
  /** 0–1, how spread out each pile is. */
  spread: number;
  magnets: number;
  /** Which drop of the magnets this is; "Drop the magnets again" counts up. */
  attempt: number;
  /** Moves made so far in this run. */
  moves: number;
};

/** One moment of a run: after `epoch` moves, how far dots are from their magnets. */
export type GroupsFrame = TimelineFrame & { run: string };

const CENTRES: Record<"two" | "three", Point[]> = {
  two: [
    { x: -0.45, y: 0.1, label: 0 },
    { x: 0.45, y: -0.1, label: 1 },
  ],
  three: [
    { x: -0.5, y: -0.35, label: 0 },
    { x: 0.5, y: -0.35, label: 1 },
    { x: 0, y: 0.5, label: 2 },
  ],
};

const round = (value: number) => Math.round(value * 1000) / 1000;
const inside = (value: number) => Math.max(-0.98, Math.min(0.98, value));

/** The dots, with their real pile as the label (hidden from the magnets). */
export const pilesOf = rememberLast((piles: Piles, spread: number): Point[] => {
  const random = createRandom(7);
  const wobble = 0.05 + 0.2 * spread;
  return Array.from({ length: DOTS }, (_, index) => {
    if (piles === "rings") {
      const ring = index % 2;
      const angle = random.range(0, Math.PI * 2);
      const radius = (ring ? 0.75 : 0.25) + random.normal() * wobble * 0.5;
      return {
        x: round(inside(Math.cos(angle) * radius)),
        y: round(inside(Math.sin(angle) * radius)),
        label: ring,
      };
    }
    const centre = CENTRES[piles][index % CENTRES[piles].length] as Point;
    return {
      x: round(inside(centre.x + random.normal() * wobble)),
      y: round(inside(centre.y + random.normal() * wobble)),
      label: centre.label,
    };
  });
});

/** Magnets dropped anywhere in the square, a new place for every attempt. */
export function dropMagnets(magnets: number, attempt: number): Spot[] {
  const random = createRandom(attempt + 1);
  return Array.from({ length: magnets }, () => ({
    x: round(random.range(-0.9, 0.9)),
    y: round(random.range(-0.9, 0.9)),
  }));
}

export const stepsOf = rememberLast(
  (dots: readonly Point[], magnets: number, attempt: number): GroupStep[] =>
    groupSteps(dots, dropMagnets(magnets, attempt), MOST_MOVES),
);

export const dotsOf = (state: GroupsState) => pilesOf(state.piles, state.spread);
export const steps = (state: GroupsState) => stepsOf(dotsOf(state), state.magnets, state.attempt);

/** The moves a run takes to settle. */
export const settleAt = (state: GroupsState) => steps(state).length - 1;
/** The step on screen: the moves made, never past settling. */
export const shownStep = (state: GroupsState) => Math.min(state.moves, settleAt(state));
export const settled = (state: GroupsState) => state.moves >= settleAt(state);

export const runKeyOf = (state: GroupsState) =>
  `${state.piles}|${state.spread}|${state.magnets}|${state.attempt}`;

/** Every moment from the drop to the move on screen. */
export function framesOf(state: GroupsState): GroupsFrame[] {
  const run = runKeyOf(state);
  return steps(state)
    .slice(0, shownStep(state) + 1)
    .map((step, epoch) => ({ epoch, loss: step.spread, run }));
}

/** The share of dots whose group, read one way, is mostly one group of the other. */
function purity(found: readonly number[], real: readonly number[]): number {
  const tally = new Map<number, Map<number, number>>();
  found.forEach((group, index) => {
    const inner = tally.get(group) ?? new Map<number, number>();
    const other = real[index] ?? 0;
    inner.set(other, (inner.get(other) ?? 0) + 1);
    tally.set(group, inner);
  });
  let agreeing = 0;
  for (const inner of tally.values()) agreeing += Math.max(...inner.values());
  return found.length ? agreeing / found.length : 1;
}

/** True when the magnets' groups are the real piles: none split, none merged. */
export function matchesPiles(groups: readonly number[], dots: readonly Point[]): boolean {
  const real = dots.map((dot) => dot.label);
  return Math.min(purity(groups, real), purity(real, groups)) >= MATCH;
}

/** The magnets settled on groups that are not the real piles. */
export function wrongGroups(state: GroupsState): boolean {
  if (!settled(state)) return false;
  const last = steps(state).at(-1);
  return last ? !matchesPiles(last.groups, dotsOf(state)) : false;
}

/** The guess's answer: three piles, three magnets, dropped twenty different ways. */
export function everyTime(state: GroupsState): "always" | "sometimes" | null {
  if (state.piles !== "three" || state.magnets !== 3) return null;
  const dots = dotsOf(state);
  for (let attempt = 0; attempt < TRIES; attempt += 1) {
    const last = stepsOf(dots, 3, attempt).at(-1);
    if (last && !matchesPiles(last.groups, dots)) return "sometimes";
  }
  return "always";
}

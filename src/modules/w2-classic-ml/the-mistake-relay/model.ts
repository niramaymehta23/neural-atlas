import { gridInputs, type Point } from "@/data/datasets";
import { nudgeAt, relayClassifier, runRelay, sigmoid, type Relay } from "@/engine/ml/boost";
import { fieldOf } from "@/engine/ml/field";
import { GARDEN_NAMES, newDots, type GardenName } from "@/features/classic/garden";
import { rememberLast } from "@/features/classic/memo";
import type { TimelineFrame } from "@/platform/contract";

export const GARDENS = GARDEN_NAMES;
export const LIMITS = {
  runners: { min: 0, max: 60 },
  size: { min: 1, max: 3 },
  push: { min: 0.05, max: 1 },
};
export const FIELD = 48;
const GRID = gridInputs(FIELD);

export type RelayState = {
  garden: GardenName;
  points: Point[];
  brush: number;
  /** Runners added so far. */
  runners: number;
  /** How hard each runner pushes (the learning rate). */
  push: number;
  /** Questions each runner asks (its tree's depth). */
  size: number;
};

/** One moment of the relay: after `epoch` runners, how much it gets right. */
export type RelayFrame = TimelineFrame & {
  /** Share right on its own dots. */
  own: number;
  /** Share right on new dots (null for an own garden). */
  fresh: number | null;
  /** Which relay this moment belongs to (its dots and settings). */
  run: string;
};

/** "Chases noise": new dots this much below their best… */
export const DROP = 0.04;
/** …while its own dots are nearly all right. */
export const FITTED = 0.95;
/** The guess is about adding this many runners. */
export const MANY = 40;
const NOTICEABLE = 0.02;

export const relayOf = rememberLast(
  (points: readonly Point[], runners: number, push: number, size: number): Relay =>
    runRelay(points, { runners, depth: size, rate: push }),
);

const freshFor = rememberLast((garden: GardenName) => newDots(garden));

/**
 * The share right after 0, 1, 2 … runners, keeping each dot's running score so the whole curve
 * costs one pass per runner.
 */
export function rightCurve(relay: Relay, dots: readonly Point[]): number[] {
  const scores = dots.map(() => relay.base);
  const share = () =>
    dots.length
      ? dots.filter((dot, index) => (sigmoid(scores[index] ?? 0) > 0.5 ? 1 : 0) === dot.label)
          .length / dots.length
      : 0;
  const curve = [share()];
  for (const runner of relay.runners) {
    dots.forEach((dot, index) => {
      scores[index] = (scores[index] ?? 0) + nudgeAt(runner, dot.x, dot.y);
    });
    curve.push(share());
  }
  return curve;
}

const gardenIds = new WeakMap<readonly Point[], number>();
let nextGardenId = 0;
const gardenId = (points: readonly Point[]) => {
  const known = gardenIds.get(points);
  if (known !== undefined) return known;
  nextGardenId += 1;
  gardenIds.set(points, nextGardenId);
  return nextGardenId;
};

/** A key for one relay: changed nests or settings start the relay over on the timeline. */
export const runKeyOf = (state: RelayState) =>
  `${gardenId(state.points)}|${state.push}|${state.size}`;

export const curvesOf = rememberLast(
  (points: readonly Point[], garden: GardenName, runners: number, push: number, size: number) => {
    const relay = relayOf(points, runners, push, size);
    const fresh = freshFor(garden);
    return {
      relay,
      own: rightCurve(relay, points),
      fresh: fresh.length ? rightCurve(relay, fresh) : null,
    };
  },
);

export const curves = (state: RelayState) =>
  curvesOf(state.points, state.garden, state.runners, state.push, state.size);

/** Every moment from no runners to the newest one. */
export function framesOf(state: RelayState): RelayFrame[] {
  const { own, fresh } = curves(state);
  const run = runKeyOf(state);
  return own.map((right, epoch) => ({
    epoch,
    loss: 1 - right,
    own: right,
    fresh: fresh?.[epoch] ?? null,
    run,
  }));
}

export const fieldAt = rememberLast((relay: Relay, upTo: number) =>
  fieldOf(relayClassifier(relay, upTo), GRID, 2),
);

/** How wrong each dot still is after `upTo` runners: 0 right and sure, 1 wrong and sure. */
export function wrongness(relay: Relay, dots: readonly Point[], upTo: number): number[] {
  const chance = relayClassifier(relay, upTo);
  return dots.map((dot) => Math.abs(dot.label - (chance(dot.x, dot.y)[1] ?? 0.5)));
}

/** It fits its own dots while new dots get worse than they were: it is chasing noise. */
export function chasingNoise(state: RelayState): boolean {
  const { own, fresh } = curves(state);
  if (!fresh || state.runners === 0) return false;
  const best = Math.max(...fresh);
  return (own.at(-1) ?? 0) >= FITTED && (fresh.at(-1) ?? 1) <= best - DROP;
}

/** The guess's answer: how new dots fared from the first runner to the newest. */
export function freshTrend(state: RelayState): "rises" | "falls" | "same" | null {
  const { fresh } = curves(state);
  if (!fresh || state.runners < MANY) return null;
  const best = Math.max(...fresh.slice(1));
  const first = fresh[1] ?? 0;
  const last = fresh.at(-1) ?? 0;
  if (last < best - NOTICEABLE) return "falls";
  if (last > first + NOTICEABLE) return "rises";
  return "same";
}

/**
 * Stubborn vs jumpy: a crowd of robots, each fitting a curve to its own handful of noisy points
 * from the same wave. Each robot's guesses at two spots become one dart: how far off it is at the
 * first spot (across) and at the second (up). Stubborn robots bunch up away from the bullseye;
 * jumpy ones scatter around it. Worked out in one go from state (no practice), so a link shows
 * the same darts.
 */
import { curveAt, fitCurve } from "@/engine/fit/least-squares";
import { createRandom } from "@/engine/random";

export type DartsState = {
  /** How bendy each robot's curve can be: the highest power it may use (0 is flat). */
  bendy: number;
  /** How many examples each robot sees. */
  examples: number;
  /** Throws so far: each throw gives every robot a fresh handful of examples. */
  throws: number;
};

export type Spot = { x: number; y: number };
export type Dart = { across: number; up: number };

export const LIMITS = { bendy: { min: 0, max: 9 }, examples: { min: 5, max: 30 } };
export const ROBOTS = 12;
const NOISE = 0.25;
const RIDGE = 1e-4;
/** The two spots every robot is asked about. */
export const SPOTS = [-0.55, 0.75] as const;
/** The board's reach, in the same units as the wave; darts further out miss the board. */
export const BOARD = 1.2;
/** Darts this far apart on average count as scattered everywhere. */
export const SCATTERED = 0.8;
/** For the guess: a spread this wide is scattered, a centre this far out is off the bullseye. */
const SPREAD_WIDE = 0.5;
const CENTRE_OFF = 0.4;

export const wave = (x: number) => 0.6 * Math.sin(2.2 * x);

const round = (value: number) => Math.round(value * 1000) / 1000;

/** The examples robot `robot` sees on throw `throws`. */
export function examplesFor(robot: number, throws: number, count: number): Spot[] {
  const random = createRandom(1000 + throws * ROBOTS + robot);
  return Array.from({ length: count }, () => {
    const x = random.range(-1, 1);
    return { x: round(x), y: round(wave(x) + random.normal() * NOISE) };
  });
}

/** Each robot's curve: its weights, lowest power first. */
export function robotsOf({ bendy, examples, throws }: DartsState): number[][] {
  return Array.from({ length: ROBOTS }, (_, robot) =>
    fitCurve(examplesFor(robot, throws, examples), bendy, RIDGE),
  );
}

export const dartOf = (weights: readonly number[]): Dart => ({
  across: curveAt(weights, SPOTS[0]) - wave(SPOTS[0]),
  up: curveAt(weights, SPOTS[1]) - wave(SPOTS[1]),
});

export const dartsOf = (state: DartsState) => robotsOf(state).map(dartOf);

/** Where the darts bunch (their middle) and how far they sit from it on average. */
export function grouping(darts: readonly Dart[]) {
  const centre = {
    across: darts.reduce((sum, { across }) => sum + across, 0) / (darts.length || 1),
    up: darts.reduce((sum, { up }) => sum + up, 0) / (darts.length || 1),
  };
  const spread =
    darts.reduce(
      (sum, { across, up }) => sum + Math.hypot(across - centre.across, up - centre.up),
      0,
    ) / (darts.length || 1);
  return { centre, off: Math.hypot(centre.across, centre.up), spread };
}

export const offBoard = (darts: readonly Dart[]) =>
  darts.filter(({ across, up }) => Math.hypot(across, up) > BOARD).length;

export type Landing = "bunched-off" | "scattered" | "bullseye";
export function landing(darts: readonly Dart[]): Landing {
  const { off, spread } = grouping(darts);
  if (spread > SPREAD_WIDE) return "scattered";
  return off > CENTRE_OFF ? "bunched-off" : "bullseye";
}

export type Scatter = "tight" | "loose" | "wild";
export const scatterOf = (spread: number): Scatter =>
  spread > SCATTERED ? "wild" : spread > 0.25 ? "loose" : "tight";

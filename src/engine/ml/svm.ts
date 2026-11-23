import { multiplied } from "../multiplications";
import type { Dot } from "./types";

/**
 * How the dots are seen. "flat" compares them as they are (a straight road). "bowl" first lifts
 * each dot by its distance from the middle squared, times `lift`, so a ring can be cut by a flat
 * sheet in the air. "bumps" lifts a soft hill under every dot (a radial basis kernel), `lift`
 * setting how narrow each hill is.
 */
export type Kernel = "flat" | "bowl" | "bumps";

export type RoadOptions = {
  kernel: Kernel;
  /** Height of the lift (bowl) or narrowness of each hill (bumps); unused when flat. */
  lift: number;
  /** How strict about dots inside the road: the penalty C. */
  strict: number;
  /** Agreement at which the search stops (the KKT gap). */
  tolerance?: number;
  maxSteps?: number;
};

export type Road = {
  /** Each dot's pull on the road; dots with pull above zero are its lamp posts. */
  alpha: number[];
  /** −1 for group 0, +1 for group 1. */
  side: number[];
  dots: Dot[];
  bias: number;
  kernel: Kernel;
  lift: number;
  strict: number;
  /** False when it stopped at `maxSteps` before agreeing to `tolerance`. */
  settled: boolean;
};

const TAU = 1e-12;

export function kernelOf(kernel: Kernel, lift: number) {
  if (kernel === "flat") return (a: Dot, b: Dot) => a.x * b.x + a.y * b.y;
  if (kernel === "bowl")
    return (a: Dot, b: Dot) =>
      a.x * b.x + a.y * b.y + lift * lift * (a.x * a.x + a.y * a.y) * (b.x * b.x + b.y * b.y);
  return (a: Dot, b: Dot) => Math.exp(-lift * ((a.x - b.x) ** 2 + (a.y - b.y) ** 2));
}

/** How many multiplications comparing one pair of dots takes. */
const kernelCost = (kernel: Kernel) => (kernel === "flat" ? 2 : kernel === "bowl" ? 9 : 3);

/**
 * The widest road between two groups (a soft-margin support vector machine), solved by SMO with
 * the maximal violating pair (as libsvm does): deterministic, ties to the lower index.
 */
export function buildRoad(dots: readonly Dot[], options: RoadOptions): Road {
  const { kernel, lift, strict, tolerance = 1e-3, maxSteps = 20_000 } = options;
  const n = dots.length;
  const k = kernelOf(kernel, lift);
  const side = dots.map((dot) => (dot.label === 1 ? 1 : -1));
  const q = new Float64Array(n * n);
  for (let i = 0; i < n; i += 1)
    for (let j = i; j < n; j += 1) {
      const value = (side[i] ?? 1) * (side[j] ?? 1) * k(dots[i] as Dot, dots[j] as Dot);
      q[i * n + j] = value;
      q[j * n + i] = value;
    }
  // Comparing every pair of dots once.
  multiplied(((n * (n + 1)) / 2) * kernelCost(kernel));
  const alpha = new Float64Array(n);
  const gradient = new Float64Array(n).fill(-1);
  const c = strict;
  const up = (t: number) =>
    ((side[t] ?? 1) === 1 && (alpha[t] ?? 0) < c) || ((side[t] ?? 1) === -1 && (alpha[t] ?? 0) > 0);
  const low = (t: number) =>
    ((side[t] ?? 1) === -1 && (alpha[t] ?? 0) < c) || ((side[t] ?? 1) === 1 && (alpha[t] ?? 0) > 0);
  let settled = n === 0;
  for (let step = 0; step < maxSteps && n > 0; step += 1) {
    let i = -1;
    let j = -1;
    let most = -Infinity;
    let least = Infinity;
    for (let t = 0; t < n; t += 1) {
      const value = -(side[t] ?? 1) * (gradient[t] ?? 0);
      if (up(t) && value > most) {
        most = value;
        i = t;
      }
      if (low(t) && value < least) {
        least = value;
        j = t;
      }
    }
    if (i < 0 || j < 0 || most - least < tolerance) {
      settled = true;
      break;
    }
    const oldI = alpha[i] ?? 0;
    const oldJ = alpha[j] ?? 0;
    const qii = q[i * n + i] ?? 0;
    const qjj = q[j * n + j] ?? 0;
    const qij = q[i * n + j] ?? 0;
    const gi = gradient[i] ?? 0;
    const gj = gradient[j] ?? 0;
    let ai = oldI;
    let aj = oldJ;
    if ((side[i] ?? 1) !== (side[j] ?? 1)) {
      const quad = Math.max(qii + qjj + 2 * qij, TAU);
      const delta = (-gi - gj) / quad;
      const diff = ai - aj;
      ai += delta;
      aj += delta;
      if (diff > 0) {
        if (aj < 0) {
          aj = 0;
          ai = diff;
        }
      } else if (ai < 0) {
        ai = 0;
        aj = -diff;
      }
      if (diff > 0) {
        if (ai > c) {
          ai = c;
          aj = c - diff;
        }
      } else if (aj > c) {
        aj = c;
        ai = c + diff;
      }
    } else {
      const quad = Math.max(qii + qjj - 2 * qij, TAU);
      const delta = (gi - gj) / quad;
      const sum = ai + aj;
      ai -= delta;
      aj += delta;
      if (sum > c) {
        if (ai > c) {
          ai = c;
          aj = sum - c;
        }
      } else if (aj < 0) {
        aj = 0;
        ai = sum;
      }
      if (sum > c) {
        if (aj > c) {
          aj = c;
          ai = sum - c;
        }
      } else if (ai < 0) {
        ai = 0;
        aj = sum;
      }
    }
    alpha[i] = ai;
    alpha[j] = aj;
    const di = ai - oldI;
    const dj = aj - oldJ;
    multiplied(2 * n);
    for (let t = 0; t < n; t += 1)
      gradient[t] = (gradient[t] ?? 0) + (q[t * n + i] ?? 0) * di + (q[t * n + j] ?? 0) * dj;
  }
  // The offset, as libsvm's calculate_rho: averaged over dots strictly inside the bounds.
  let upper = Infinity;
  let lower = -Infinity;
  let free = 0;
  let sumFree = 0;
  for (let t = 0; t < n; t += 1) {
    const yg = (side[t] ?? 1) * (gradient[t] ?? 0);
    const a = alpha[t] ?? 0;
    if (a >= c) {
      if ((side[t] ?? 1) === -1) upper = Math.min(upper, yg);
      else lower = Math.max(lower, yg);
    } else if (a <= 0) {
      if ((side[t] ?? 1) === 1) upper = Math.min(upper, yg);
      else lower = Math.max(lower, yg);
    } else {
      free += 1;
      sumFree += yg;
    }
  }
  const rho = free > 0 ? sumFree / free : Number.isFinite(upper + lower) ? (upper + lower) / 2 : 0;
  return {
    alpha: Array.from(alpha),
    side,
    dots: dots.map((dot) => ({ ...dot })),
    bias: -rho,
    kernel,
    lift,
    strict,
    settled,
  };
}

/** Pulls this small are rounding: the dot is not holding the road up. */
export const POST = 1e-6;

/** Indices of the lamp posts: the dots the road rests on. */
export function lampPosts(road: Road): number[] {
  return road.alpha.flatMap((value, index) => (value > POST ? [index] : []));
}

/**
 * Where a spot sits relative to the road: 0 on its middle line, ±1 on its edges, beyond ±1
 * outside it (positive on group 1's side).
 */
export function roadSide(road: Road) {
  const k = kernelOf(road.kernel, road.lift);
  const posts = lampPosts(road);
  const cost = kernelCost(road.kernel);
  return (x: number, y: number): number => {
    let total = road.bias;
    const spot = { x, y, label: 0 };
    multiplied(posts.length * (1 + cost));
    for (const index of posts)
      total +=
        (road.alpha[index] ?? 0) * (road.side[index] ?? 1) * k(road.dots[index] as Dot, spot);
    return total;
  };
}

/** Group shares for fields: sure only well outside the road. */
export function roadClassifier(road: Road) {
  const at = roadSide(road);
  return (x: number, y: number) => {
    const chance = 1 / (1 + Math.exp(-2 * at(x, y)));
    return [1 - chance, chance];
  };
}

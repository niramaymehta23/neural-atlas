import { createRandom } from "../random";

export type MapSettings = {
  /** How many neighbours each thing listens to (the perplexity). */
  perplexity: number;
  seed: number;
};

/** Steps of early exaggeration, when neighbours pull extra hard to form loose islands first. */
export const EXAGGERATED_STEPS = 250;
const EXAGGERATION = 12;
const START_MOMENTUM = 0.5;
const LATER_MOMENTUM = 0.8;
const LEAST_GAIN = 0.01;

/**
 * Each thing's neighbour chances (a sparse, symmetric P): for every row, a Gaussian over its
 * `3 × perplexity` nearest neighbours whose width is searched until its perplexity matches, then
 * P = (P(j|i) + P(i|j)) / 2n.
 */
export function affinities(data: Float64Array, dims: number, perplexity: number) {
  if (!Number.isInteger(dims) || dims < 1 || data.length % dims !== 0)
    throw new Error("The map needs whole rows of measurements.");
  if (!(perplexity > 0)) throw new Error("The map needs a neighbour count above zero.");
  const n = Math.floor(data.length / dims);
  const k = Math.min(n - 1, Math.max(1, Math.floor(3 * perplexity)));
  const target = Math.log(Math.min(perplexity, k));
  const rows: Map<number, number>[] = Array.from({ length: n }, () => new Map());
  const distances = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      let sum = 0;
      for (let d = 0; d < dims; d += 1) {
        const diff = (data[i * dims + d] ?? 0) - (data[j * dims + d] ?? 0);
        sum += diff * diff;
      }
      distances[j] = sum;
    }
    const near = Array.from({ length: n }, (_, j) => j)
      .filter((j) => j !== i)
      .sort((a, b) => (distances[a] ?? 0) - (distances[b] ?? 0) || a - b)
      .slice(0, k);
    // Binary search on the precision β = 1 / (2σ²) for the wanted entropy.
    let beta = 1;
    let low = -Infinity;
    let high = Infinity;
    let chances = near.map(() => 1 / k);
    const closest = distances[near[0] ?? 0] ?? 0;
    for (let tries = 0; tries < 100; tries += 1) {
      const weights = near.map((j) => Math.exp(-beta * ((distances[j] ?? 0) - closest)));
      const total = weights.reduce((sum, value) => sum + value, 0) || 1;
      chances = weights.map((value) => value / total);
      let entropy = 0;
      for (const p of chances) if (p > 1e-300) entropy -= p * Math.log(p);
      const gap = entropy - target;
      if (Math.abs(gap) < 1e-5) break;
      if (gap > 0) {
        low = beta;
        beta = high === Infinity ? beta * 2 : (beta + high) / 2;
      } else {
        high = beta;
        beta = low === -Infinity ? beta / 2 : (beta + low) / 2;
      }
    }
    near.forEach((j, at) => rows[i]?.set(j, chances[at] ?? 0));
  }
  // Symmetric, as index pairs (i < j) and their shared chance.
  const pairs: number[] = [];
  const values: number[] = [];
  for (let i = 0; i < n; i += 1)
    for (const [j, p] of rows[i] ?? []) {
      if (j < i && rows[j]?.has(i)) continue;
      const total = (p + (rows[j]?.get(i) ?? 0)) / (2 * n);
      pairs.push(Math.min(i, j), Math.max(i, j));
      values.push(total);
    }
  return { n, pairs: Uint32Array.from(pairs), values: Float64Array.from(values) };
}

export type Affinities = ReturnType<typeof affinities>;

/**
 * The map's gradient and cost for positions `y` (2 per thing). Exact: every pair repels, the
 * neighbour pairs in P attract. Returns the KL cost (at exaggeration 1).
 */
export function gradient(
  p: Affinities,
  y: Float64Array,
  exaggeration: number,
  out: Float64Array,
): number {
  const { n, pairs, values } = p;
  out.fill(0);
  let z = 0;
  const repel = new Float64Array(2 * n);
  for (let i = 0; i < n; i += 1) {
    const yi0 = y[2 * i] ?? 0;
    const yi1 = y[2 * i + 1] ?? 0;
    // Row i's sums are kept in hand and written back once, added up in the same order.
    let push0 = repel[2 * i] ?? 0;
    let push1 = repel[2 * i + 1] ?? 0;
    for (let at = 2 * i + 2; at < 2 * n; at += 2) {
      const d0 = yi0 - (y[at] ?? 0);
      const d1 = yi1 - (y[at + 1] ?? 0);
      const q = 1 / (1 + d0 * d0 + d1 * d1);
      z += 2 * q;
      const q2 = q * q;
      const away0 = q2 * d0;
      const away1 = q2 * d1;
      push0 += away0;
      push1 += away1;
      repel[at] = (repel[at] ?? 0) - away0;
      repel[at + 1] = (repel[at + 1] ?? 0) - away1;
    }
    repel[2 * i] = push0;
    repel[2 * i + 1] = push1;
  }
  let cost = 0;
  for (let at = 0; at < values.length; at += 1) {
    const i = pairs[2 * at] ?? 0;
    const j = pairs[2 * at + 1] ?? 0;
    const pij = values[at] ?? 0;
    const d0 = (y[2 * i] ?? 0) - (y[2 * j] ?? 0);
    const d1 = (y[2 * i + 1] ?? 0) - (y[2 * j + 1] ?? 0);
    const q = 1 / (1 + d0 * d0 + d1 * d1);
    const pull = exaggeration * pij * q;
    out[2 * i] = (out[2 * i] ?? 0) + pull * d0;
    out[2 * i + 1] = (out[2 * i + 1] ?? 0) + pull * d1;
    out[2 * j] = (out[2 * j] ?? 0) - pull * d0;
    out[2 * j + 1] = (out[2 * j + 1] ?? 0) - pull * d1;
    // Both orders (i, j) and (j, i) carry pij.
    if (pij > 0) cost += 2 * pij * Math.log(pij / Math.max(q / z, 1e-300));
  }
  const scale = z > 0 ? 1 / z : 0;
  for (let index = 0; index < out.length; index += 1)
    out[index] = 4 * ((out[index] ?? 0) - (repel[index] ?? 0) * scale);
  return cost;
}

export type MapRun = {
  readonly n: number;
  /** Steps taken so far. */
  readonly step: number;
  /** Positions, x then y for each thing. */
  readonly positions: Float64Array;
  /** The cost of the newest step (how unlike the neighbours the map still is). */
  readonly cost: number;
  /** Takes one more step. */
  advance(): void;
};

/** A seeded t-SNE run: the same data, settings and steps always land in the same spots. */
export function createMap(data: Float64Array, dims: number, settings: MapSettings): MapRun {
  const p = affinities(data, dims, settings.perplexity);
  const { n } = p;
  const random = createRandom(settings.seed);
  const positions = Float64Array.from({ length: 2 * n }, () => random.normal() * 1e-4);
  const velocity = new Float64Array(2 * n);
  const gains = new Float64Array(2 * n).fill(1);
  const grad = new Float64Array(2 * n);
  const rate = Math.max(n / EXAGGERATION, 50);
  let step = 0;
  let cost = Number.NaN;
  return {
    n,
    get step() {
      return step;
    },
    positions,
    get cost() {
      return cost;
    },
    advance() {
      const early = step < EXAGGERATED_STEPS;
      cost = gradient(p, positions, early ? EXAGGERATION : 1, grad);
      const momentum = early ? START_MOMENTUM : LATER_MOMENTUM;
      let mx = 0;
      let my = 0;
      for (let index = 0; index < 2 * n; index += 1) {
        const g = grad[index] ?? 0;
        const v = velocity[index] ?? 0;
        const gain = Math.max(
          LEAST_GAIN,
          Math.sign(g) !== Math.sign(v) ? (gains[index] ?? 1) + 0.2 : (gains[index] ?? 1) * 0.8,
        );
        gains[index] = gain;
        const next = momentum * v - rate * gain * g;
        velocity[index] = next;
        positions[index] = (positions[index] ?? 0) + next;
        if (index % 2 === 0) mx += positions[index] ?? 0;
        else my += positions[index] ?? 0;
      }
      // Keep the map centred.
      for (let i = 0; i < n; i += 1) {
        positions[2 * i] = (positions[2 * i] ?? 0) - mx / n;
        positions[2 * i + 1] = (positions[2 * i + 1] ?? 0) - my / n;
      }
      step += 1;
    },
  };
}

/** Area of the smallest convex shape around the dots (monotone chain hull, shoelace area). */
export function hullArea(positions: ArrayLike<number>): number {
  const n = Math.floor(positions.length / 2);
  const dots = Array.from(
    { length: n },
    (_, i) => [positions[2 * i] ?? 0, positions[2 * i + 1] ?? 0] as const,
  ).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (dots.length < 3) return 0;
  const cross = (o: readonly number[], a: readonly number[], b: readonly number[]) =>
    ((a[0] ?? 0) - (o[0] ?? 0)) * ((b[1] ?? 0) - (o[1] ?? 0)) -
    ((a[1] ?? 0) - (o[1] ?? 0)) * ((b[0] ?? 0) - (o[0] ?? 0));
  const half = (list: (readonly [number, number])[]) => {
    const chain: (readonly [number, number])[] = [];
    for (const dot of list) {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2] ?? dot, chain[chain.length - 1] ?? dot, dot) <= 0
      )
        chain.pop();
      chain.push(dot);
    }
    chain.pop();
    return chain;
  };
  const hull = [...half(dots), ...half([...dots].reverse())];
  let area = 0;
  hull.forEach((dot, index) => {
    const next = hull[(index + 1) % hull.length] ?? dot;
    area += dot[0] * next[1] - next[0] * dot[1];
  });
  return Math.abs(area) / 2;
}

/**
 * How evenly spread a 2D layout is (the Clark–Evans ratio): the average distance to a nearest
 * neighbour over what it would be for the same dots scattered at random across the same area.
 * About 1 or more when spread out; well below 1 when the dots gather into islands.
 */
export function spacing(positions: ArrayLike<number>): number {
  const n = Math.floor(positions.length / 2);
  const area = hullArea(positions);
  if (n < 3 || area <= 0) return 1;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const x = positions[2 * i] ?? 0;
    const y = positions[2 * i + 1] ?? 0;
    let best = Infinity;
    // The exact distance is slow to work out, so only dots that may be the nearest get it.
    let worthIt = Infinity;
    for (let j = 0; j < n; j += 1) {
      if (j === i) continue;
      const dx = x - (positions[2 * j] ?? 0);
      const dy = y - (positions[2 * j + 1] ?? 0);
      if (dx * dx + dy * dy > worthIt) continue;
      best = Math.min(best, Math.hypot(dx, dy));
      worthIt = best * best * (1 + 1e-9);
    }
    total += best;
  }
  return total / n / (0.5 * Math.sqrt(area / n));
}

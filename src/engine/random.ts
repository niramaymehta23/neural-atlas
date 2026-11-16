/**
 * Seeded randomness, so a run, a puzzle or a replay is the same every time it is opened.
 * mulberry32: tiny, fast and good enough for initial weights, shuffles and toy data.
 */
export type Random = {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** Standard normal (mean 0, spread 1). */
  normal(): number;
  /** Integer in [0, size). */
  int(size: number): number;
};

export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    // Box–Muller; 1 - next() keeps the logarithm away from zero.
    normal: () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()),
    int: (size) => Math.floor(next() * size),
  };
}

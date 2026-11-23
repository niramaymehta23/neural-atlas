/**
 * The compute meter's count: every time an engine multiplies two of a model's numbers (a weight
 * by a signal, a distance by itself, a score by how much the future counts), the loop that does
 * it adds what it did here. A multiplication followed by an addition counts once, which is how
 * computing is counted for big models too. The bookkeeping around them (averages, normalising, an
 * optimiser's memory) is left out, as it is there. One count per thread: a worker keeps its own and posts
 * it along with its results.
 */
let total = 0;

/** Called by the engines' inner loops, with how many multiplications they just did. */
export function multiplied(times: number): void {
  total += times;
}

/** Multiplications done on this thread since it started. */
export function multiplications(): number {
  return total;
}

/** How many multiplications `work` did, with its answer. */
export function counting<T>(work: () => T): { result: T; times: number } {
  const before = total;
  const result = work();
  return { result, times: total - before };
}

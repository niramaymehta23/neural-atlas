import { createRandom } from "../random";

export type Spot = { x: number; y: number };

export type GroupStep = {
  /** Where each magnet sits at this step. */
  centres: Spot[];
  /** Which magnet each dot belongs to at this step. */
  groups: number[];
  /** The average squared distance from each dot to its magnet (the spread, lower is tighter). */
  spread: number;
};

const square = (a: Spot, b: Spot) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** Each dot to its nearest centre (ties to the lower centre). */
export function nearest(dots: readonly Spot[], centres: readonly Spot[]): number[] {
  return dots.map((dot) => {
    let best = 0;
    let bestDistance = Infinity;
    centres.forEach((centre, index) => {
      const distance = square(dot, centre);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  });
}

function spreadOf(dots: readonly Spot[], centres: readonly Spot[], groups: readonly number[]) {
  if (dots.length === 0) return 0;
  let total = 0;
  dots.forEach((dot, index) => {
    total += square(dot, centres[groups[index] ?? 0] ?? dot);
  });
  return total / dots.length;
}

/**
 * Seeded k-means++ starts: the first magnet on a random dot, each next one on a dot picked with
 * chance proportional to its squared distance from the nearest magnet so far.
 */
export function seedCentres(dots: readonly Spot[], k: number, seed: number): Spot[] {
  if (dots.length === 0) return [];
  const random = createRandom(seed);
  const first = dots[random.int(dots.length)] as Spot;
  const centres: Spot[] = [{ x: first.x, y: first.y }];
  while (centres.length < Math.min(k, dots.length)) {
    const weights = dots.map((dot) => Math.min(...centres.map((centre) => square(dot, centre))));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let pick = random.next() * total;
    let chosen = dots.length - 1;
    for (let index = 0; index < dots.length; index += 1) {
      pick -= weights[index] ?? 0;
      if (pick < 0) {
        chosen = index;
        break;
      }
    }
    // Every dot already sits on a magnet: the rest start on top of the first ones.
    const dot = total > 0 ? (dots[chosen] as Spot) : (dots[centres.length % dots.length] as Spot);
    centres.push({ x: dot.x, y: dot.y });
  }
  return centres;
}

/**
 * k-means from given starting magnets: step 0 is the starts with their nearest dots; each step
 * moves every magnet to the middle of its dots, then regroups. A magnet with no dots stays put.
 * Stops once no dot changes group, or after `maxSteps` moves.
 */
export function groupSteps(
  dots: readonly Spot[],
  starts: readonly Spot[],
  maxSteps: number,
): GroupStep[] {
  let centres = starts.map(({ x, y }) => ({ x, y }));
  let groups = nearest(dots, centres);
  const steps: GroupStep[] = [{ centres, groups, spread: spreadOf(dots, centres, groups) }];
  for (let step = 0; step < maxSteps; step += 1) {
    centres = centres.map((centre, index) => {
      let sx = 0;
      let sy = 0;
      let count = 0;
      dots.forEach((dot, at) => {
        if (groups[at] !== index) return;
        sx += dot.x;
        sy += dot.y;
        count += 1;
      });
      return count > 0 ? { x: sx / count, y: sy / count } : centre;
    });
    const next = nearest(dots, centres);
    const changed = next.some((group, index) => group !== groups[index]);
    groups = next;
    steps.push({ centres, groups, spread: spreadOf(dots, centres, groups) });
    if (!changed) break;
  }
  return steps;
}

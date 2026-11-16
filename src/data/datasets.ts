/**
 * The toy datasets every world reuses, seeded so a lesson, a puzzle and a replay see the same
 * dots. Points live in the square from −1 to 1 on both axes.
 */
import type { Samples } from "@/engine/model/protocol";
import { createRandom, type Random } from "@/engine/random";

export type Point = { x: number; y: number; label: number };

export const DATASETS = ["blobs", "moons", "spiral", "xor", "circles"] as const;
export type DatasetName = (typeof DATASETS)[number];

export type DatasetOptions = {
  count?: number;
  /** Wobble added to every point, in the same units as the square. */
  noise?: number;
  seed?: number;
  /** Groups, for blobs and spiral (2–3); the others always have two. */
  classes?: number;
};

type Generator = (
  index: number,
  label: number,
  classes: number,
  random: Random,
) => [number, number];

const GENERATORS: Record<DatasetName, Generator> = {
  blobs: (_index, label, classes, random) => {
    const angle = (label / classes) * Math.PI * 2 + Math.PI / 4;
    return [
      0.5 * Math.cos(angle) + random.normal() * 0.15,
      0.5 * Math.sin(angle) + random.normal() * 0.15,
    ];
  },
  moons: (_index, label, _classes, random) => {
    const t = random.next() * Math.PI;
    return label === 0
      ? [0.6 * Math.cos(t) - 0.25, 0.6 * Math.sin(t) - 0.15]
      : [0.6 - 0.6 * Math.cos(t) - 0.35, 0.15 - 0.6 * Math.sin(t)];
  },
  spiral: (_index, label, classes, random) => {
    const t = random.next();
    const angle = t * 3.5 + (label / classes) * Math.PI * 2;
    return [0.9 * t * Math.cos(angle), 0.9 * t * Math.sin(angle)];
  },
  xor: (_index, label, _classes, random) => {
    const quadrant = random.int(2);
    const sign = quadrant === 0 ? 1 : -1;
    const x = sign * random.range(0.1, 0.9);
    const y = (label === 0 ? sign : -sign) * random.range(0.1, 0.9);
    return [x, y];
  },
  circles: (_index, label, _classes, random) => {
    const angle = random.next() * Math.PI * 2;
    const radius = label === 0 ? 0.35 : 0.8;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  },
};

const MULTI_CLASS: readonly DatasetName[] = ["blobs", "spiral"];

export function makeDataset(
  name: DatasetName,
  { count = 200, noise = 0.05, seed = 1, classes = 2 }: DatasetOptions = {},
): Point[] {
  const random = createRandom(seed);
  const groups = MULTI_CLASS.includes(name) ? Math.min(3, Math.max(2, classes)) : 2;
  return Array.from({ length: count }, (_, index) => {
    const label = index % groups;
    const [x, y] = GENERATORS[name](index, label, groups, random);
    const clamp = (value: number) => Math.min(1, Math.max(-1, value));
    return { x: clamp(x + random.normal() * noise), y: clamp(y + random.normal() * noise), label };
  });
}

/** Points as training examples: (x, y) in, the group label out (one number per point). */
export function toSamples(points: readonly Point[]): Samples {
  return {
    inputs: Float32Array.from(points.flatMap(({ x, y }) => [x, y])),
    targets: Float32Array.from(points, ({ label }) => label),
    count: points.length,
  };
}

/** Centres of a `resolution²` grid over the square, row by row from the top, as model inputs. */
export function gridInputs(resolution: number): Float32Array {
  const inputs = new Float32Array(resolution * resolution * 2);
  for (let row = 0; row < resolution; row += 1)
    for (let column = 0; column < resolution; column += 1) {
      const at = (row * resolution + column) * 2;
      inputs[at] = ((column + 0.5) / resolution) * 2 - 1;
      inputs[at + 1] = 1 - ((row + 0.5) / resolution) * 2;
    }
  return inputs;
}

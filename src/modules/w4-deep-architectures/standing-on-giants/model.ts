/**
 * Standing on giants: teach a tiny new AI to tell three groups apart from a few photos each. It
 * starts either from the 256 numbers a big picture-reading AI (MobileNet) gives for a photo, or
 * from 256 bare grey dots of the photo. The tiny AI is the same either way: one layer that learns
 * a score for each group. Reusing the big AI's numbers is transfer learning.
 */
import { FEATURES, SIDE } from "@/engine/vision/seeing";
import { GROUP_SIZE, PHOTO_GROUPS, type PhotoGroup } from "@/features/inside/use-photo";
import type { TimelineFrame } from "@/platform/contract";

export const STARTS = ["giant", "blank"] as const;
export type Start = (typeof STARTS)[number];

/** At most this many photos of each group teach; the rest are kept back to test on. */
export const MOST_TEACH = 5;
/** The photos kept back to test on, in each group: always the last three. */
export const TESTS = GROUP_SIZE - MOST_TEACH;
export const GROUPS = PHOTO_GROUPS.length;

export type GiantState = {
  start: Start;
  /** "How many photos of each to teach with", 1 … MOST_TEACH. */
  teach: number;
};

/** How the tiny AI did on the photos it never saw; missions and guesses read it. */
export type GiantFrame = TimelineFrame & {
  key: string;
  /** Kept-back photos it named right from the start chosen, out of GROUPS × TESTS. */
  right: number;
  /** The same count from each start, taught with the same photos. */
  giant: number;
  blank: number;
};

/** Named right this many of the kept-back photos or more: "most of them". */
export const MOST_RIGHT = 7;

export const keyOf = ({ start, teach }: GiantState) => `${start}|${teach}`;

/** Photo file names for a group: `cats-1` … `cats-8`. */
export const photoName = (group: PhotoGroup, index: number) => `${group}-${index + 1}`;

/** Bare dots: the photo shrunk to 16 × 16 greys. */
const DOTS = 16;
export function greyDots(pixels: Uint8ClampedArray): Float32Array {
  const tile = SIDE / DOTS;
  const dots = new Float32Array(DOTS * DOTS);
  for (let row = 0; row < SIDE; row += 1) {
    for (let column = 0; column < SIDE; column += 1) {
      const at = (row * SIDE + column) * 4;
      const grey =
        0.299 * (pixels[at] ?? 0) + 0.587 * (pixels[at + 1] ?? 0) + 0.114 * (pixels[at + 2] ?? 0);
      const dot = Math.floor(row / tile) * DOTS + Math.floor(column / tile);
      dots[dot] = (dots[dot] ?? 0) + grey / 255 / (tile * tile);
    }
  }
  return dots;
}

/**
 * Numbers ready to learn from: centred on their own middle and scaled to length 1, so photos of
 * different brightness (or the giant's bigger numbers) all learn at the same pace.
 */
export function ready(numbers: ArrayLike<number>): Float32Array {
  const out = Float32Array.from(numbers);
  const middle = out.reduce((sum, value) => sum + value, 0) / out.length;
  let length = 0;
  for (let at = 0; at < out.length; at += 1) {
    out[at] = (out[at] ?? 0) - middle;
    length += (out[at] ?? 0) ** 2;
  }
  length = Math.sqrt(length) || 1;
  return out.map((value) => value / length);
}

export type Example = { numbers: Float32Array; group: number };
export type Learned = { weights: Float32Array; bias: Float32Array };

/** Passes over the teaching photos, and how big each learning step is. */
export const PASSES = 200;
export const STEP = 2;

/** Each group's share for one photo (they add up to 1). */
export function shares({ weights, bias }: Learned, numbers: Float32Array): Float32Array {
  const scores = new Float32Array(GROUPS);
  for (let group = 0; group < GROUPS; group += 1) {
    let score = bias[group] ?? 0;
    for (let at = 0; at < FEATURES; at += 1)
      score += (weights[group * FEATURES + at] ?? 0) * (numbers[at] ?? 0);
    scores[group] = score;
  }
  const top = Math.max(...scores);
  const raised = scores.map((score) => Math.exp(score - top));
  const total = raised.reduce((sum, value) => sum + value, 0);
  return raised.map((value) => value / total);
}

export const bestOf = (values: Float32Array) =>
  values.reduce((best, value, at) => (value > (values[best] ?? 0) ? at : best), 0);

/** The tiny AI taught on `examples`: a score per group, nudged towards the right group each pass. */
export function teach(examples: readonly Example[]): Learned {
  const learned = { weights: new Float32Array(GROUPS * FEATURES), bias: new Float32Array(GROUPS) };
  if (examples.length === 0) return learned;
  for (let pass = 0; pass < PASSES; pass += 1) {
    const weightPush = new Float32Array(GROUPS * FEATURES);
    const biasPush = new Float32Array(GROUPS);
    for (const { numbers, group } of examples) {
      const guess = shares(learned, numbers);
      for (let other = 0; other < GROUPS; other += 1) {
        const miss = (guess[other] ?? 0) - (other === group ? 1 : 0);
        biasPush[other] = (biasPush[other] ?? 0) + miss;
        for (let at = 0; at < FEATURES; at += 1) {
          weightPush[other * FEATURES + at] =
            (weightPush[other * FEATURES + at] ?? 0) + miss * (numbers[at] ?? 0);
        }
      }
    }
    const scale = STEP / examples.length;
    for (let at = 0; at < weightPush.length; at += 1) {
      learned.weights[at] = (learned.weights[at] ?? 0) - scale * (weightPush[at] ?? 0);
    }
    for (let at = 0; at < GROUPS; at += 1)
      learned.bias[at] = (learned.bias[at] ?? 0) - scale * (biasPush[at] ?? 0);
  }
  return learned;
}

/** How many of `tests` the tiny AI names right. */
export const rightOf = (learned: Learned, tests: readonly Example[]) =>
  tests.filter(({ numbers, group }) => bestOf(shares(learned, numbers)) === group).length;

export function frameFor(
  state: GiantState,
  scores: Record<Start, number>,
  epoch: number,
): GiantFrame {
  return { epoch, loss: 0, key: keyOf(state), right: scores[state.start], ...scores };
}

/**
 * The World 4 face models (public/models/faces-v1, trained by scripts/train-faces.py), run as plain
 * typed-array maths: an ordered squeeze, three maps of faces and a fog cleaner. Pictures are 32 × 32
 * ink amounts in 0–1 (0 paper, 1 ink), row by row. Pure: no DOM, no React, the same answer every time.
 */
import { createRandom } from "../random";

export const SIDE = 32;
export const PIXELS = SIDE * SIDE;
/** Where the files are served; root-relative so it is always the site's own origin. */
export const FACES_PATH = "/models/faces-v1/";

type TensorEntry = { name: string; shape: number[]; offset: number };
type ModelEntry = { file: string; tensors: TensorEntry[] };

export type FacesManifest = {
  size: number;
  faces: { file: string; count: number };
  models: {
    squeeze: ModelEntry & { code: number };
    "map-0": ModelEntry & { tidy: number; spots: [number, number][] };
    "map-1": ModelEntry & { tidy: number; spots: [number, number][] };
    "map-2": ModelEntry & { tidy: number; spots: [number, number][] };
    fog: ModelEntry & { steps: number; time: number; kept: number[] };
  };
};

export type ModelName = keyof FacesManifest["models"];

/** A layer's numbers: `weight` is inputs × outputs, row by row (row = one input). */
type Layer = { weight: Float32Array; bias: Float32Array; inputs: number; outputs: number };
export type Weights = Record<string, Layer>;

/** Splits one model file into its layers, as the manifest lays them out. */
export function readWeights(entry: ModelEntry, bytes: ArrayBuffer): Weights {
  const tensors = new Map<string, Float32Array>();
  for (const { name, shape, offset } of entry.tensors) {
    const length = shape.reduce((product, size) => product * size, 1);
    if (offset + length * 4 > bytes.byteLength) throw new Error(`${entry.file} is cut short.`);
    tensors.set(name, new Float32Array(bytes, offset, length));
  }
  const layers: Weights = {};
  for (const { name, shape } of entry.tensors) {
    if (!name.endsWith(".weight")) continue;
    const base = name.slice(0, -".weight".length);
    const weight = tensors.get(name);
    const bias = tensors.get(`${base}.bias`);
    const [inputs = 0, outputs = 0] = shape;
    if (!weight || !bias || bias.length !== outputs) throw new Error(`${entry.file}: ${base}?`);
    layers[base] = { weight, bias, inputs, outputs };
  }
  return layers;
}

const layerOf = (weights: Weights, name: string) => {
  const layer = weights[name];
  if (!layer) throw new Error(`The model has no ${name}.`);
  return layer;
};

/** input × weight + bias, then an optional bend. */
function dense(
  weights: Weights,
  name: string,
  input: ArrayLike<number>,
  bend?: (value: number) => number,
): Float64Array {
  const { weight, bias, inputs, outputs } = layerOf(weights, name);
  if (input.length !== inputs) throw new Error(`${name} wants ${inputs} numbers.`);
  const out = Float64Array.from(bias);
  for (let row = 0; row < inputs; row += 1) {
    const value = input[row] ?? 0;
    if (value === 0) continue;
    const start = row * outputs;
    for (let column = 0; column < outputs; column += 1) {
      out[column] = (out[column] ?? 0) + value * (weight[start + column] ?? 0);
    }
  }
  if (bend) for (let index = 0; index < outputs; index += 1) out[index] = bend(out[index] ?? 0);
  return out;
}

const relu = (value: number) => (value > 0 ? value : 0);
const chance = (value: number) => 1 / (1 + Math.exp(-value));
const silu = (value: number) => value * chance(value);

const toPicture = (scores: ArrayLike<number>) => Float32Array.from(scores, chance);

/** The squeeze's 16 numbers for a picture, most telling first. */
export const squeeze = (weights: Weights, picture: ArrayLike<number>) =>
  dense(weights, "enc2", dense(weights, "enc1", picture, relu));

/** Rebuilds a picture from only the first `keep` of its squeeze numbers (the rest count as 0). */
export function rebuild(weights: Weights, code: ArrayLike<number>, keep: number): Float32Array {
  const kept = Float64Array.from(code, (value, index) => (index < keep ? value : 0));
  return toPicture(dense(weights, "dec2", dense(weights, "dec1", kept, relu)));
}

/** The picture at one spot of a map of faces. */
export const pictureAt = (weights: Weights, x: number, y: number) =>
  toPicture(
    dense(weights, "dec3", dense(weights, "dec2", dense(weights, "dec1", [x, y], relu), relu)),
  );

/** Sines and cosines of the fog step, the same sums the trainer used. */
export function timeFeatures(step: number, size: number): Float64Array {
  const half = size / 2;
  const out = new Float64Array(size);
  for (let index = 0; index < half; index += 1) {
    const angle = step * Math.exp((-Math.log(1000) * index) / half);
    out[index] = Math.sin(angle);
    out[half + index] = Math.cos(angle);
  }
  return out;
}

function addInto(target: Float64Array, extra: Float64Array) {
  for (let index = 0; index < target.length; index += 1)
    target[index] = (target[index] ?? 0) + (extra[index] ?? 0);
}

/** The fog cleaner's guess of the clear picture (−1 paper … 1 ink) under `foggy` at `step`. */
export function guessClear(
  weights: Weights,
  manifest: FacesManifest["models"]["fog"],
  foggy: ArrayLike<number>,
  step: number,
): Float64Array {
  const time = timeFeatures(step, manifest.time);
  let hidden = dense(weights, "in1", foggy);
  addInto(hidden, dense(weights, "t1", time));
  hidden = hidden.map(silu);
  let next = dense(weights, "in2", hidden);
  addInto(next, dense(weights, "t2", time));
  hidden = next.map(silu);
  next = dense(weights, "in3", hidden);
  addInto(next, dense(weights, "t3", time));
  hidden = next.map(silu);
  return dense(weights, "out", hidden).map((value) => Math.max(-1, Math.min(1, value)));
}

/** Pixels painted by the learner, to steer the fog: ink (1) or paper (0) at a pixel index. */
export type Steer = ReadonlyMap<number, 0 | 1>;

export type FogMoment = {
  /** How much fog is left, 1 (all fog) … 0 (clear). */
  fog: number;
  /** The picture as it is now, ink amounts in 0–1. */
  picture: Float32Array;
};

/**
 * Cleans fog into a picture in `cleanings` steps (spread evenly over the 200 the cleaner learned),
 * from the fog that `seed` draws. Painted pixels are kept at the learner's paint, fogged to match
 * each step, so the rest of the picture grows to fit them. Yields every moment, fog first.
 */
export function* clearFog(
  weights: Weights,
  manifest: FacesManifest["models"]["fog"],
  seed: number,
  cleanings: number,
  steer: Steer = new Map(),
): Generator<FogMoment> {
  const random = createRandom(seed);
  const last = manifest.steps - 1;
  const steps = Math.max(1, Math.min(manifest.steps, Math.round(cleanings)));
  const sequence = Array.from({ length: steps }, (_, index) =>
    steps === 1 ? last : Math.round(last - (index * last) / (steps - 1)),
  );
  const keptAt = (step: number) => manifest.kept[step] ?? 1;
  let current: Float64Array = Float64Array.from({ length: PIXELS }, () => random.normal());
  const pin = (picture: Float64Array, step: number, kept: number) => {
    for (const [pixel, ink] of steer) {
      const clear = ink * 2 - 1;
      picture[pixel] =
        step < 0 ? clear : Math.sqrt(kept) * clear + Math.sqrt(1 - kept) * random.normal();
    }
  };
  pin(current, last, keptAt(last));
  const show = (picture: Float64Array) =>
    Float32Array.from(picture, (value) => Math.max(0, Math.min(1, (value + 1) / 2)));
  yield { fog: 1, picture: show(current) };
  for (const [index, step] of sequence.entries()) {
    const kept = keptAt(step);
    const clear = guessClear(weights, manifest, current, step);
    const nextStep = sequence[index + 1];
    if (nextStep === undefined) {
      pin(clear, -1, 1);
      current = clear;
      yield { fog: 0, picture: show(clear) };
      break;
    }
    // Step back along the fog: keep the guessed picture and the fog it implies, with less fog.
    const nextKept = keptAt(nextStep);
    const next = new Float64Array(PIXELS);
    for (let pixel = 0; pixel < PIXELS; pixel += 1) {
      const guess = clear[pixel] ?? 0;
      const fog = ((current[pixel] ?? 0) - Math.sqrt(kept) * guess) / Math.sqrt(1 - kept);
      next[pixel] = Math.sqrt(nextKept) * guess + Math.sqrt(1 - nextKept) * fog;
    }
    pin(next, nextStep, nextKept);
    current = next;
    yield { fog: 1 - (index + 1) / steps, picture: show(current) };
  }
}

/** One of the stored real faces, as ink amounts in 0–1. */
export const faceAt = (faces: Uint8Array, index: number) =>
  Float32Array.from(faces.subarray(index * PIXELS, (index + 1) * PIXELS), (value) => value / 255);

/** The mean squared gap between a picture and the closest of the first `among` real faces. */
export function nearestGap(picture: ArrayLike<number>, faces: Uint8Array, among = 1000): number {
  const count = Math.min(among, Math.floor(faces.length / PIXELS));
  let best = Infinity;
  for (let face = 0; face < count; face += 1) {
    let gap = 0;
    const start = face * PIXELS;
    for (let pixel = 0; pixel < PIXELS && gap < best * PIXELS; pixel += 1) {
      const difference = (picture[pixel] ?? 0) - (faces[start + pixel] ?? 0) / 255;
      gap += difference * difference;
    }
    best = Math.min(best, gap / PIXELS);
  }
  return best;
}

/**
 * How sharp a picture is: the mean change between neighbouring pixels. Real cartoon faces have crisp
 * outlines (0.07 or more); mush, the blurry average of many faces, sits near 0.05.
 */
export function sharpness(picture: ArrayLike<number>): number {
  let change = 0;
  for (let row = 0; row < SIDE; row += 1) {
    for (let column = 0; column < SIDE; column += 1) {
      const here = picture[row * SIDE + column] ?? 0;
      if (column + 1 < SIDE) change += Math.abs((picture[row * SIDE + column + 1] ?? 0) - here);
      if (row + 1 < SIDE) change += Math.abs((picture[(row + 1) * SIDE + column] ?? 0) - here);
    }
  }
  return change / (2 * SIDE * (SIDE - 1));
}

/** Below this sharpness a picture is mush, not a face (every real face is above 0.07). */
export const MUSH = 0.066;

/** The mean squared gap between two pictures. */
export function gap(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let pixel = 0; pixel < a.length; pixel += 1) {
    const difference = (a[pixel] ?? 0) - (b[pixel] ?? 0);
    sum += difference * difference;
  }
  return sum / Math.max(1, a.length);
}

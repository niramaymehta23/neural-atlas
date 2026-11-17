/**
 * Squeeze and rebuild: a picture is squeezed into a short list of numbers, then rebuilt from only
 * the first few. The numbers are ordered (the first says the most), so keeping fewer blurs the
 * rebuild. Speckles added before the squeeze do not survive it: the list only has room for faces.
 */
import { faceAt, gap, rebuild, sharpness, squeeze, type Weights } from "@/engine/generative/faces";
import { createRandom } from "@/engine/random";
import type { TimelineFrame } from "@/platform/contract";

export type SqueezeState = {
  /** Which of the stored faces, 0–11. */
  face: number;
  /** How many of the 16 numbers the rebuild may use. */
  keep: number;
  /** How speckled the picture is before the squeeze, 0–1. */
  smudge: number;
};

export type SqueezeFrame = TimelineFrame & {
  face: number;
  keep: number;
  smudge: number;
  /** The gap between the rebuild and the clean face. */
  gap: number;
  /** Whether a fully speckled copy of this face comes back clean (fixed settings, for the guess). */
  cleansSpeckles: boolean;
};

export const FACES = 12;
export const KEEP = { min: 1, most: 16 };
/** A rebuild this close or closer is almost exactly the face; up to ROUGH it is close but softer. */
export const ALMOST = 0.006;
export const ROUGH = 0.02;
/** Speckles are as big as half the gap between paper and ink at a full smudge. */
const SPECKLE = 0.5;
/** Real faces change by about 0.08 between neighbouring pixels; speckled ones by over 0.3. */
export const SPECKLED = 0.15;

/** The picture that goes into the squeeze: the face, speckled by the smudge dial. */
export function inputOf(faces: Uint8Array, face: number, smudge: number): Float32Array {
  const clean = faceAt(faces, face);
  if (smudge <= 0) return clean;
  // Each face has its own speckles, the same every time, so a link shows the same picture.
  const random = createRandom(face + 1);
  return clean.map((value) => Math.min(1, Math.max(0, value + smudge * SPECKLE * random.normal())));
}

export type Squeezed = {
  input: Float32Array;
  numbers: Float64Array;
  rebuilt: Float32Array;
};

export function squeezeOf(weights: Weights, faces: Uint8Array, state: SqueezeState): Squeezed {
  const input = inputOf(faces, state.face, state.smudge);
  const numbers = squeeze(weights, input);
  return { input, numbers, rebuilt: rebuild(weights, numbers, state.keep) };
}

/** What the scene records each time the squeeze changes, for the mission and the guess. */
export function frameOf(
  weights: Weights,
  faces: Uint8Array,
  state: SqueezeState,
  rebuilt: Float32Array,
  epoch: number,
): SqueezeFrame {
  const speckled = inputOf(faces, state.face, 1);
  const cleaned = rebuild(weights, squeeze(weights, speckled), KEEP.most);
  const missed = gap(rebuilt, faceAt(faces, state.face));
  return {
    epoch,
    loss: missed,
    face: state.face,
    keep: state.keep,
    smudge: state.smudge,
    gap: missed,
    cleansSpeckles: sharpness(cleaned) < SPECKLED,
  };
}

export type Closeness = "almost" | "rough" | "blurry";

export const closenessOf = (missed: number): Closeness =>
  missed <= ALMOST ? "almost" : missed <= ROUGH ? "rough" : "blurry";

/** The newest frame, when it shows what the dials say now. */
export const matches = (state: SqueezeState, frame: SqueezeFrame | undefined) =>
  frame !== undefined &&
  frame.face === state.face &&
  frame.keep === state.keep &&
  frame.smudge === state.smudge;

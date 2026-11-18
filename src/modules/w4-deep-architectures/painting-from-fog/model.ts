/**
 * Painting from fog: a machine starts from pure fog and, step by step, guesses the face hidden in
 * it and clears a little fog towards that guess. With enough steps it finds a crisp face; in one
 * or two giant steps it can only guess the blurry average of all faces. Pixels the learner paints
 * are held as painted, so the face grows to fit them.
 */
import {
  clearFog,
  MUSH,
  PIXELS,
  sharpness,
  type FacesManifest,
  type Steer,
  type Weights,
} from "@/engine/generative/faces";
import type { TimelineFrame } from "@/platform/contract";

export const CLEANINGS = { min: 1, most: 50 };
export const FOGS = { min: 1, most: 20 };
export const BRUSHES = ["ink", "paper", "rub"] as const;
export type Brush = (typeof BRUSHES)[number];
/** At most this many runs are remembered in a link. */
export const MOST_RUNS = 10_000;
/** Runs this short or shorter count as skipping most of the steps. */
export const FEW = 5;

export type FogState = {
  /** How many cleaning steps, 1–50. */
  cleanings: number;
  /** Which fog it starts from, 1–20 (the same fog every time). */
  fog: number;
  /** Painted pixels, "pixel:ink" with ink 1 or paper 0, each pixel at most once. */
  paint: string[];
  brush: Brush;
  /** Clearings asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

export type FogFrame = TimelineFrame & {
  key: string;
  /** The picture at this moment, ink amounts 0–1. */
  picture: number[];
  cleanings: number;
  /** How sharp the picture is (see `sharpness`). */
  sharp: number;
};

const PAINTED = /^(\d{1,4}):([01])$/;

/** A painted pixel from its link form, or null when it is not one. */
export function parsePaint(entry: unknown): { pixel: number; ink: 0 | 1 } | null {
  if (typeof entry !== "string") return null;
  const [, pixel, ink] = PAINTED.exec(entry) ?? [];
  const index = Number(pixel);
  if (pixel === undefined || !Number.isInteger(index) || index < 0 || index >= PIXELS) return null;
  return { pixel: index, ink: ink === "1" ? 1 : 0 };
}

/** The paint as a pixel → ink map; a later entry for a pixel wins. */
export function steerOf(paint: readonly string[]): Steer {
  const steer = new Map<number, 0 | 1>();
  for (const entry of paint) {
    const painted = parsePaint(entry);
    if (painted) steer.set(painted.pixel, painted.ink);
  }
  return steer;
}

/** Paint kept tidy for a link: valid entries only, one per pixel, in pixel order. */
export function tidyPaint(paint: readonly unknown[]): string[] {
  const steer = new Map<number, 0 | 1>();
  for (const entry of paint.slice(0, PIXELS * 2)) {
    const painted = parsePaint(entry);
    if (painted) steer.set(painted.pixel, painted.ink);
  }
  return [...steer].sort(([a], [b]) => a - b).map(([pixel, ink]) => `${pixel}:${ink}`);
}

/** Paints (or rubs out) the given pixels with a brush. */
export function brushOver(paint: readonly string[], pixels: readonly number[], brush: Brush) {
  const steer = new Map(steerOf(paint));
  for (const pixel of pixels) {
    if (brush === "rub") steer.delete(pixel);
    else steer.set(pixel, brush === "ink" ? 1 : 0);
  }
  return tidyPaint([...steer].map(([pixel, ink]) => `${pixel}:${ink}`));
}

export const keyOf = ({ cleanings, fog, paint }: FogState) =>
  `${cleanings}|${fog}|${paint.join(",")}`;

/** Every moment of the clearing `state` describes, fog first. */
export function* fogRun(
  weights: Weights,
  fogModel: FacesManifest["models"]["fog"],
  state: FogState,
): Generator<FogFrame> {
  const key = keyOf(state);
  let epoch = 0;
  for (const { fog, picture } of clearFog(
    weights,
    fogModel,
    state.fog,
    state.cleanings,
    steerOf(state.paint),
  )) {
    yield {
      epoch,
      loss: fog,
      key,
      picture: Array.from(picture),
      cleanings: state.cleanings,
      sharp: sharpness(picture),
    };
    epoch += 1;
  }
}

export const isFinished = (state: FogState, frame: FogFrame | undefined): frame is FogFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.cleanings;

export const isMush = (frame: FogFrame) => frame.sharp < MUSH;

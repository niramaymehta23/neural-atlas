/**
 * Smooth imagination: a machine keeps a map where every face it saw has a spot, and draws the
 * face at any spot. Kept tidy, the faces fill the map evenly, so every spot is a believable face;
 * left untidy, they bunch up and leave torn corners where it draws nonsense.
 */
import {
  MUSH,
  nearestGap,
  pictureAt,
  sharpness,
  type FacesManifest,
  type Weights,
} from "@/engine/generative/faces";
import type { TimelineFrame } from "@/platform/contract";

export const TIDY = { min: 0, most: 2 } as const;
export type Tidy = 0 | 1 | 2;
export const mapName = (tidy: number) => `map-${tidy}` as "map-0" | "map-1" | "map-2";
export const ACROSS = { min: 4, most: 12 };
/** How far one arrow press moves the marker, as a share of the map. */
export const STEP = 0.025;
/** The fixed check behind the guess: this many faces across, whatever the dial says. */
export const CHECK = 12;
/** A picture further than this from every real face, or blurrier than mush, is nonsense. */
export const FAR_FROM_FACES = 0.03;
/** Real faces compared against (the first of the stored ones): enough to find a match, quickly. */
export const AMONG = 400;

export type MapState = {
  /** How tidy the map is kept: 0 not at all, 1 a little, 2 fully. */
  tidy: number;
  /** How many faces across the map shows. */
  across: number;
  /** The marker, as shares of the map: 0 left … 1 right, 0 top … 1 bottom. */
  x: number;
  y: number;
};

export type MapFrame = TimelineFrame & {
  tidy: number;
  x: number;
  y: number;
  /** The picture at the marker is nonsense. */
  nonsense: boolean;
  /** Nonsense faces in the fixed 12 × 12 check of this map; null until checked. */
  torn: number | null;
};

export type MapWindow = { left: number; right: number; top: number; bottom: number };

/** The part of a map shown: two spreads either side of the middle of its real faces. */
export function windowOf(spots: readonly (readonly [number, number])[]): MapWindow {
  const spread = (values: number[]) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const deviation = Math.sqrt(
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length,
    );
    return [mean - 2 * deviation, mean + 2 * deviation] as const;
  };
  const [left, right] = spread(spots.map(([x]) => x));
  // Screen rows grow downwards, the map's second number upwards.
  const [bottom, top] = spread(spots.map(([, y]) => y));
  return { left, right, top, bottom };
}

/** The map spot under a share of the window. */
export const spotAt = (window: MapWindow, x: number, y: number): [number, number] => [
  window.left + x * (window.right - window.left),
  window.top + y * (window.bottom - window.top),
];

/** Where a map spot sits in the window, as shares (may fall outside 0–1). */
export const shareOf = (window: MapWindow, [x, y]: readonly [number, number]) => ({
  x: (x - window.left) / (window.right - window.left),
  y: (y - window.top) / (window.bottom - window.top),
});

export const isNonsense = (picture: ArrayLike<number>, faces: Uint8Array) =>
  sharpness(picture) < MUSH || nearestGap(picture, faces, AMONG) > FAR_FROM_FACES;

/** The picture at the middle of tile (column, row) of an `across` × `across` mosaic. */
export const tileAt = (
  weights: Weights,
  window: MapWindow,
  across: number,
  column: number,
  row: number,
) => pictureAt(weights, ...spotAt(window, (column + 0.5) / across, (row + 0.5) / across));

/** The map's window from the manifest. */
export const windowFor = (manifest: FacesManifest, tidy: number) =>
  windowOf(manifest.models[mapName(tidy)].spots);

/** The newest frame, when it shows the dials and marker as they are now. */
export const matches = (state: MapState, frame: MapFrame | undefined): frame is MapFrame =>
  frame !== undefined && frame.tidy === state.tidy && frame.x === state.x && frame.y === state.y;

/** Shares rounded to a thousandth, so links stay short and replay exactly. */
export const share = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;

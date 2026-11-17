/**
 * Zooming out: a photo shrunk tile by tile. Every square tile of dots becomes one dot, keeping
 * either the brightest of each colour in the tile or the average. That is pooling. The learner sees
 * the shrunk picture as blocks; the picture-reading AI, which only takes full-size pictures, is
 * shown it blown back up smoothly, as if seen from further away.
 */
import { SIDE } from "@/engine/vision/seeing";
import type { SinglePhoto } from "@/features/inside/use-photo";
import type { TimelineFrame } from "@/platform/contract";

/** Tile sides, smallest first: each divides the 224-dot photo exactly. 1 is the photo itself. */
export const TILES = [1, 2, 4, 8, 16, 32, 56, 112] as const;
export const MOST = TILES.length - 1;
/** From this shrink on, the picture is just a few blocks across. */
export const FEW_BLOCKS = TILES.indexOf(32);

export const KEEPS = ["average", "brightest"] as const;
export type Keep = (typeof KEEPS)[number];

export type ZoomState = {
  photo: SinglePhoto;
  /** "How much to shrink": 0 (not at all) … MOST, an index into TILES. */
  shrink: number;
  keep: Keep;
};

/** What the AI said at every shrink of this photo; missions and guesses read it. */
export type ZoomFrame = TimelineFrame & {
  key: string;
  /** The AI's answer at each shrink, in TILES order. */
  names: string[];
  /** The biggest shrink at which the AI still says what it said for the full photo. */
  lastKnown: number;
};

export const keyOf = ({ photo, keep }: Pick<ZoomState, "photo" | "keep">) => `${photo}|${keep}`;

/** The biggest shrink at which every answer so far matches the full photo's. */
export function lastKnownOf(names: readonly string[]): number {
  let last = 0;
  while (last + 1 < names.length && names[last + 1] === names[0]) last += 1;
  return last;
}

export function frameFor(state: ZoomState, names: string[], epoch: number): ZoomFrame {
  return { epoch, loss: 0, key: keyOf(state), names, lastKnown: lastKnownOf(names) };
}

/** The shrunk picture: (224 / tile)² dots, RGB kept per tile. */
export function pool(pixels: Uint8ClampedArray, tile: number, keep: Keep): Float32Array {
  const blocks = SIDE / tile;
  // Whole-number sums are exact in a Float64Array; the average divides once at the end.
  const kept = new Float64Array(blocks * blocks * 3);
  for (let row = 0; row < SIDE; row += 1) {
    for (let column = 0; column < SIDE; column += 1) {
      const at = (row * SIDE + column) * 4;
      const block = (Math.floor(row / tile) * blocks + Math.floor(column / tile)) * 3;
      for (let colour = 0; colour < 3; colour += 1) {
        const value = pixels[at + colour] ?? 0;
        const before = kept[block + colour] ?? 0;
        kept[block + colour] = keep === "brightest" ? Math.max(before, value) : before + value;
      }
    }
  }
  return Float32Array.from(kept, (value) => (keep === "average" ? value / (tile * tile) : value));
}

/** The shrunk picture blown back up smoothly to full size, as if seen from further away. */
export function blowUp(small: Float32Array, blocks: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(SIDE * SIDE * 4);
  const scale = blocks / SIDE;
  const at = (row: number, column: number, colour: number) =>
    small[
      (Math.min(blocks - 1, Math.max(0, row)) * blocks +
        Math.min(blocks - 1, Math.max(0, column))) *
        3 +
        colour
    ] ?? 0;
  for (let row = 0; row < SIDE; row += 1) {
    const y = (row + 0.5) * scale - 0.5;
    const top = Math.floor(y);
    const down = y - top;
    for (let column = 0; column < SIDE; column += 1) {
      const x = (column + 0.5) * scale - 0.5;
      const left = Math.floor(x);
      const across = x - left;
      for (let colour = 0; colour < 3; colour += 1) {
        out[(row * SIDE + column) * 4 + colour] =
          (at(top, left, colour) * (1 - across) + at(top, left + 1, colour) * across) * (1 - down) +
          (at(top + 1, left, colour) * (1 - across) + at(top + 1, left + 1, colour) * across) *
            down;
      }
      out[(row * SIDE + column) * 4 + 3] = 255;
    }
  }
  return out;
}

/** The shrunk picture as RGBA bytes, one dot per block, for drawing. */
export function toBytes(small: Float32Array, blocks: number): Uint8ClampedArray {
  const bytes = new Uint8ClampedArray(blocks * blocks * 4);
  for (let block = 0; block < blocks * blocks; block += 1) {
    for (let colour = 0; colour < 3; colour += 1)
      bytes[block * 4 + colour] = small[block * 3 + colour] ?? 0;
    bytes[block * 4 + 3] = 255;
  }
  return bytes;
}

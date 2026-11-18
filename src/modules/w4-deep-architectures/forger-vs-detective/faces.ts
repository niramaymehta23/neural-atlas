/**
 * The six real faces, and the face any point on the plane would be: points between two spots
 * blend their faces, and points far from the ring of spots look wrong. Faces differ in head shape,
 * eyes, mouth and hair, so they are told apart without colour.
 */
import { SPOTS } from "@/engine/generative/gan";

export type FaceLook = {
  /** Half width and half height of the head, in a 0–1 box. */
  width: number;
  height: number;
  /** Eye size. */
  eyes: number;
  /** −1 frown … 1 smile. */
  smile: number;
  /** 0 no hair … 1 a full fringe. */
  hair: number;
  /** 0 a believable face … 1 clearly wrong. */
  odd: number;
};

const REAL: readonly Omit<FaceLook, "odd">[] = [
  { width: 0.4, height: 0.4, eyes: 0.07, smile: 1, hair: 1 },
  { width: 0.3, height: 0.45, eyes: 0.04, smile: -1, hair: 0 },
  { width: 0.45, height: 0.34, eyes: 0.08, smile: 0, hair: 1 },
  { width: 0.38, height: 0.4, eyes: 0.08, smile: -0.8, hair: 0 },
  { width: 0.3, height: 0.45, eyes: 0.045, smile: 0.9, hair: 1 },
  { width: 0.45, height: 0.34, eyes: 0.055, smile: 0.4, hair: 0 },
];

const FALLBACK = { width: 0.4, height: 0.4, eyes: 0.06, smile: 0, hair: 0 };
const RING = Math.hypot(...(SPOTS[0] ?? [0, 0.65]));
const smooth = (value: number) => value * value * (3 - 2 * value);

export const realLook = (index: number): FaceLook => ({
  ...(REAL[index % REAL.length] ?? FALLBACK),
  odd: 0,
});

/** The face a point on the plane shows. */
export function lookAt(x: number, y: number): FaceLook {
  const turn = (Math.atan2(y, x) - Math.PI / 2 + 4 * Math.PI) % (2 * Math.PI);
  const place = (turn / (2 * Math.PI)) * REAL.length;
  const index = Math.floor(place) % REAL.length;
  const along = smooth(place - Math.floor(place));
  const a = REAL[index] ?? FALLBACK;
  const b = REAL[(index + 1) % REAL.length] ?? FALLBACK;
  const mix = (key: keyof Omit<FaceLook, "odd">) => a[key] * (1 - along) + b[key] * along;
  const between = 1 - Math.abs(along - 0.5) * 2;
  const away = Math.min(1, Math.abs(Math.hypot(x, y) - RING) / 0.35);
  return {
    width: mix("width"),
    height: mix("height"),
    eyes: mix("eyes"),
    smile: mix("smile"),
    hair: mix("hair") > 0.5 ? 1 : 0,
    odd: Math.min(1, Math.max(away, between * 0.6)),
  };
}

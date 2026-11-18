/**
 * Captions placed on photos, scored on the shared map of pictures and words: closeness above the
 * dial's threshold counts as a match, right or not.
 */
import { captionPlace, matchOf, type Matcher } from "@/engine/language/picture-words";
import type { WordPlaces } from "@/engine/language/word-places";
import type { TimelineFrame } from "@/platform/contract";
import { CAPTIONS, PHOTOS } from "./captions";

export type PicturesState = {
  /** For each photo, the caption on it, or -1. */
  placed: number[];
  /** How close counts as a match. */
  threshold: number;
  /** "How many trick captions are in the pile": the last captions, which fit no photo. */
  tricks: number;
  /** The caption picked up, or -1. */
  holding: number;
};

export type Placement = {
  photo: number;
  caption: number;
  likeness: number;
  match: boolean;
  right: boolean;
};

export type PicturesFrame = TimelineFrame & {
  placed: number[];
  threshold: number;
  placements: Placement[];
};

export const THRESHOLD = { min: 0.3, max: 0.95, start: 0.6 } as const;
/** Captions that belong to one of the photos; the rest are tricks. */
export const FITTING = PHOTOS.length;
export const TRICKS = CAPTIONS.length - FITTING;

/** The captions in the pile with `tricks` trick captions. */
export const pileOf = (tricks: number) => CAPTIONS.slice(0, FITTING + tricks);

/** `placed` with any caption no longer in the pile taken off. */
export const keepInPile = (placed: readonly number[], tricks: number) =>
  placed.map((caption) => (caption >= FITTING + tricks ? -1 : caption));

export function likenessOf(
  matcher: Matcher,
  places: WordPlaces,
  caption: number,
  photo: number,
): number {
  const place = captionPlace(matcher, places, CAPTIONS[caption]?.text ?? "");
  const stored = matcher.photos.find(({ file }) => file === PHOTOS[photo]?.file);
  return place && stored ? matchOf(place, stored.place) : 0;
}

export function frameOf(
  matcher: Matcher,
  places: WordPlaces,
  state: PicturesState,
): Omit<PicturesFrame, "epoch"> {
  const placements = state.placed.flatMap((caption, photo) => {
    if (caption < 0 || !CAPTIONS[caption] || !PHOTOS[photo]) return [];
    const likeness = likenessOf(matcher, places, caption, photo);
    return [
      {
        photo,
        caption,
        likeness,
        match: likeness >= state.threshold,
        right: CAPTIONS[caption]?.kind === PHOTOS[photo]?.kind,
      },
    ];
  });
  return { loss: 0, placed: state.placed, threshold: state.threshold, placements };
}

export const fooled = (frame: Pick<PicturesFrame, "placements">) =>
  frame.placements.some(({ match, right }) => match && !right);

export const EMPTY = PHOTOS.map(() => -1);

/** `placed` with `caption` on `photo` (taken off any other photo first). */
export function place(placed: readonly number[], photo: number, caption: number): number[] {
  return placed.map((current, at) => (at === photo ? caption : current === caption ? -1 : current));
}

/**
 * The shared map of photos and captions (public/models/picture-words-v1, built by
 * scripts/build-picture-words.ts). A caption's place is its words' average GloVe place times the
 * stored word map; a photo's place is stored. How well they match is how closely their arrows
 * point the same way: 1 is the same way, 0 unrelated, below 0 opposite.
 */
import { meaningOf, type WordPlaces } from "./word-places";

export const PICTURES_PATH = "/models/picture-words-v1/";
export const PHOTOS_PATH = "/models/photos-v1/";

export type Matcher = {
  size: number;
  wordMap: number[];
  photos: { file: string; kind: string; place: number[] }[];
};

export function readMatcher(text: string): Matcher {
  const matcher = JSON.parse(text) as Matcher;
  if (matcher.wordMap.length !== 50 * matcher.size)
    throw new Error("The word map is the wrong size.");
  return matcher;
}

/** A caption's place on the shared map, or null when none of its words are known. */
export function captionPlace(
  matcher: Matcher,
  places: WordPlaces,
  caption: string,
): number[] | null {
  const meaning = meaningOf(places, caption);
  if (!meaning) return null;
  const place = new Array<number>(matcher.size).fill(0);
  meaning.forEach((value, row) => {
    for (let column = 0; column < matcher.size; column += 1) {
      place[column] =
        (place[column] ?? 0) + value * (matcher.wordMap[row * matcher.size + column] ?? 0);
    }
  });
  const length = Math.hypot(...place) || 1;
  return place.map((value) => value / length);
}

/** How well a caption's place matches a photo's: −1 to 1. */
export function matchOf(caption: readonly number[], photo: readonly number[]): number {
  return caption.reduce((sum, value, at) => sum + value * (photo[at] ?? 0), 0);
}

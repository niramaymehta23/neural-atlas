/**
 * Word arithmetic on GloVe's word places: start at one word, follow the arrow from a second word
 * to a third, and see which words sit nearest where you land.
 */
import {
  analogy,
  nearest,
  vectorOf,
  type Near,
  type WordPlaces,
} from "@/engine/language/word-places";
import type { TimelineFrame } from "@/platform/contract";

export type PlacesState = {
  /** Where the walk starts ("king"). */
  from: string;
  /** The arrow's tail ("man"). */
  minus: string;
  /** The arrow's head ("woman"). */
  plus: string;
  /** How far along the arrow to walk: 0 stays put, 1 is the whole arrow. */
  amount: number;
  /** Leave the three start words out of the answers. */
  skip: boolean;
  /** How many of the nearest words to show. */
  shown: number;
};

export type PlacesFrame = TimelineFrame & {
  from: string;
  minus: string;
  plus: string;
  amount: number;
  skip: boolean;
  shown: number;
  /** Every word is on the map. */
  known: boolean;
  /** The nearest words to where the walk lands, nearest first. */
  landing: Near[];
};

export const MOST_LETTERS = 20;
export const MOST_AMOUNT = 1.5;
export const NEAREST = { min: 3, max: 8, start: 5 } as const;
/** "The whole arrow", give or take a notch of the dial. */
export const WHOLE = 0.05;

/** A typed word as the map stores it: small letters only. */
export const tidy = (word: string) =>
  word
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, MOST_LETTERS);

export const startWords = (state: Pick<PlacesState, "from" | "minus" | "plus">) => [
  state.from,
  state.minus,
  state.plus,
];

export function unknownOf(places: WordPlaces, state: PlacesState): string[] {
  return startWords(state).filter((word) => !vectorOf(places, word));
}

export function frameOf(places: WordPlaces, state: PlacesState): Omit<PlacesFrame, "epoch"> {
  const vector = analogy(places, state.from, state.minus, state.plus, state.amount);
  return {
    loss: 0,
    ...state,
    known: vector !== null,
    landing: vector
      ? nearest(places, vector, state.shown, state.skip ? new Set(startWords(state)) : new Set())
      : [],
  };
}

/** The whole arrow was followed and the nearest word is one the walk started from. */
export function landsOnStart(frame: PlacesFrame): boolean {
  const top = frame.landing[0]?.word;
  return (
    frame.known &&
    Math.abs(frame.amount - 1) <= WHOLE &&
    top !== undefined &&
    startWords(frame).includes(top)
  );
}

/** The guess's words, and the choice the nearest landing word is (null until it can be told). */
export const GUESS = { from: "king", minus: "man", plus: "woman" } as const;
export function guessAnswer(frame: PlacesFrame | undefined): string | null {
  if (
    !frame?.known ||
    !frame.skip ||
    Math.abs(frame.amount - 1) > WHOLE ||
    frame.from !== GUESS.from ||
    frame.minus !== GUESS.minus ||
    frame.plus !== GUESS.plus
  )
    return null;
  const top = frame.landing[0]?.word;
  return top === "queen" || top === "prince" ? top : "other";
}

/** Two flat directions to draw the map on: along the arrow, and from the arrow's tail to the start. */
export function flatMap(places: WordPlaces, state: PlacesState) {
  const a = vectorOf(places, state.from);
  const b = vectorOf(places, state.minus);
  const c = vectorOf(places, state.plus);
  if (!a || !b || !c) return null;
  const along = unitOf(c.map((value, d) => value - (b[d] ?? 0)));
  const toStart = a.map((value, d) => value - (b[d] ?? 0));
  const shared = dot(toStart, along);
  const across = unitOf(toStart.map((value, d) => value - shared * (along[d] ?? 0)));
  /** Where a place sits on the flat map, measured from the arrow's tail. */
  return (vector: ArrayLike<number>) => {
    const from = Array.from(vector, (value, d) => value - (b[d] ?? 0));
    return { x: dot(from, along), y: dot(from, across) };
  };
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>) {
  let total = 0;
  for (let d = 0; d < a.length; d += 1) total += (a[d] ?? 0) * (b[d] ?? 0);
  return total;
}

function unitOf(vector: Float32Array): Float32Array {
  const length = Math.sqrt(dot(vector, vector)) || 1;
  return vector.map((value) => value / length);
}

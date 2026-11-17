/**
 * Meaning as places: every word in a pile of sentences gets a place on a flat map. Words that
 * share sentences are pulled together and random words are pushed apart, so words of the same kind
 * gather. With no push at all, the pull wins and every word ends up in one spot.
 */
import { learnWordMap, vocabularyOf } from "@/engine/embedding/word-map";
import type { TimelineFrame } from "@/platform/contract";
import { KIND_WORDS, WORD_LISTS } from "./corpus";

export type MapState = {
  /** "How hard different words push apart", 0–1 on the dial. */
  push: number;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** Maps asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

export type MapFrame = TimelineFrame & {
  key: string;
  rounds: number;
  /** x and y for every word, in `VOCABULARY` order. */
  places: number[];
  /** How far the farthest picked word sits from the picked words' middle. */
  reach: number;
  /** How many picked words have a word of their own kind as their nearest picked word. */
  gathered: number;
};

export const VOCABULARY = vocabularyOf(WORD_LISTS);
/** Where each picked word sits in `VOCABULARY`, kind by kind. */
export const PICKED = KIND_WORDS.flatMap((kind, group) =>
  kind.map((word) => ({ word, group, at: VOCABULARY.indexOf(word) })),
);
export const ROUNDS = 400;
const EVERY = 5;
const SEED = 7;
const PUSHES = 3;
/**
 * Picked words all within this of their middle: one spot. Measured (seed 7, 400 rounds): with no
 * push the reach ends at 0.051 or less for every step; with any push it is 0.99 or more.
 */
export const ONE_SPOT = 0.1;

/** The push weight grows with the dial; the step grows faster than the dial. */
export const pushOf = (dial: number) => 0.3 * Math.min(1, Math.max(0, dial));
export const stepOf = (dial: number) => 0.01 * 10 ** Math.min(1, Math.max(0, dial));

export const keyOf = ({ push, step }: MapState) => `${push}|${step}`;

export const placeOf = (places: readonly number[], at: number): [number, number] => [
  places[at * 2] ?? 0,
  places[at * 2 + 1] ?? 0,
];

/** The middle of the picked words. */
export function middleOf(places: readonly number[]): [number, number] {
  let x = 0;
  let y = 0;
  for (const { at } of PICKED) {
    const [px, py] = placeOf(places, at);
    x += px;
    y += py;
  }
  return [x / PICKED.length, y / PICKED.length];
}

function measure(places: readonly number[]) {
  const [mx, my] = middleOf(places);
  const spots = PICKED.map(({ at }) => placeOf(places, at));
  const reach = Math.max(0, ...spots.map(([x, y]) => Math.hypot(x - mx, y - my)));
  let gathered = 0;
  spots.forEach(([x, y], index) => {
    let nearest = -1;
    let best = Infinity;
    spots.forEach(([ox, oy], other) => {
      const gap = Math.hypot(x - ox, y - oy);
      if (other !== index && gap < best) {
        best = gap;
        nearest = other;
      }
    });
    if (PICKED[nearest]?.group === PICKED[index]?.group) gathered += 1;
  });
  return { reach, gathered };
}

/** Every moment of the map `state` describes, the scattered start first. */
export function* mapRun(state: MapState): Generator<MapFrame> {
  const key = keyOf(state);
  const settings = { push: pushOf(state.push), step: stepOf(state.step), pushes: PUSHES };
  for (const moment of learnWordMap(WORD_LISTS, settings, SEED, ROUNDS, EVERY)) {
    yield {
      epoch: moment.round,
      // How much pull is still left to do.
      loss: moment.strain,
      key,
      rounds: ROUNDS,
      places: moment.places,
      ...measure(moment.places),
    };
  }
}

export const isFinished = (state: MapState, frame: MapFrame | undefined): frame is MapFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

export const squashed = (frame: Pick<MapFrame, "reach">) => frame.reach < ONE_SPOT;

/** Whether "cat" sits nearer to "dog" or to "bus". */
export function catNearer(places: readonly number[]): "dog" | "bus" {
  const spot = (word: string) => placeOf(places, VOCABULARY.indexOf(word));
  const [cx, cy] = spot("cat");
  const gap = (word: string) => {
    const [x, y] = spot(word);
    return Math.hypot(x - cx, y - cy);
  };
  return gap("dog") <= gap("bus") ? "dog" : "bus";
}

import { createRandom } from "@/engine/random";
import type { MapPort } from "@/engine/ml/tsne-client";
import { rememberLast } from "@/features/classic/memo";
import type { TimelineFrame } from "@/platform/contract";

export const DATA = ["zoo", "noise"] as const;
export type MapData = (typeof DATA)[number];
export const LIMITS = {
  count: { min: 200, max: 1000, step: 100 },
  perplexity: { min: 2, max: 50 },
  steps: { min: 0, max: 1000 },
  attempt: { min: 0, max: 999 },
};
/** Measurements per thing. */
export const DIMS = 10;
/** Kinds of animal in the zoo. */
const KINDS = 3;
/** Below this the map has gathered into islands; an even spread is about 1. */
export const ISLANDS = 0.55;
/** The mission needs this many steps, so islands are not just the first loose clumps. */
export const SETTLED = 500;
/** The guess is told after this many steps, with this few neighbours or fewer. */
export const GUESS_STEPS = 750;
export const FEW = 3;

export type MapState = {
  data: MapData;
  count: number;
  /** How many neighbours each thing listens to (the perplexity). */
  perplexity: number;
  /** Steps the map has taken (a link redraws the map up to here). */
  steps: number;
  attempt: number;
  running: boolean;
};

/** One recorded moment of the map. */
export type MapFrame = TimelineFrame & {
  positions: Float32Array;
  spacing: number;
  run: string;
};

/**
 * The things to map: a zoo of three kinds of animal, ten measurements each (so they really form
 * three groups), or pure noise with no groups at all. `kinds` says which animal each one is.
 */
export const thingsOf = rememberLast((data: MapData, count: number) => {
  const random = createRandom(data === "zoo" ? 21 : 22);
  const centres = Array.from({ length: KINDS }, () =>
    Array.from({ length: DIMS }, () => random.normal() * 3),
  );
  const kinds = Array.from({ length: count }, (_, index) => (data === "zoo" ? index % KINDS : 0));
  const values = new Float64Array(count * DIMS);
  kinds.forEach((kind, index) => {
    for (let dim = 0; dim < DIMS; dim += 1)
      values[index * DIMS + dim] =
        (data === "zoo" ? (centres[kind]?.[dim] ?? 0) : 0) + random.normal();
  });
  return { values, kinds };
});

export const runKeyOf = (state: MapState) =>
  `${state.data}|${state.count}|${state.perplexity}|${state.attempt}`;

/** The map drew islands out of noise that has none, after settling for a while. */
export const islandsFromNoise = (state: MapState, frame: MapFrame | undefined) =>
  state.data === "noise" &&
  !!frame &&
  frame.run === runKeyOf(state) &&
  frame.epoch >= SETTLED &&
  frame.spacing < ISLANDS;

/** The guess's answer: noise, a few neighbours, a long settle. */
export function noiseAnswer(
  state: MapState,
  frame: MapFrame | undefined,
): "islands" | "even" | null {
  if (state.data !== "noise" || state.perplexity > FEW) return null;
  if (!frame || frame.run !== runKeyOf(state) || frame.epoch < GUESS_STEPS) return null;
  return frame.spacing < ISLANDS ? "islands" : "even";
}

/** How the scene reaches the map worker; tests connect an in-process one. */
export const mapConnection: { connect: (() => MapPort) | undefined } = { connect: undefined };

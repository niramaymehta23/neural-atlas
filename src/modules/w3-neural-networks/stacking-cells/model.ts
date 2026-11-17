/**
 * The garden and the team of cells: the lesson's state, its starting gardens, the network it
 * describes, and the log that lets a shared link replay a run exactly. The training itself runs
 * in the ModelEngine worker.
 */
import { makeDataset, toSamples, type DatasetName, type Point } from "@/data/datasets";
import { createFieldReader, type FieldReader } from "@/engine/model/forward";
import type { ModelSpec, ScheduledChange, Snapshot } from "@/engine/model/protocol";
import type { TimelineFrame } from "@/platform/contract";

export const GARDENS = ["blobs", "ring", "spiral", "own"] as const;
export type Garden = (typeof GARDENS)[number];

/** The bends a layer of cells can use: smooth, cut off below zero, or cut off with a trickle. */
export const BENDS = ["tanh", "relu", "leakyRelu"] as const;
export type Bend = (typeof BENDS)[number];

/** Something that changed mid-practice, at the practice round it took effect (ENG-09). */
export type Change =
  /** The step dial moved from `was` to `step`. */
  | { epoch: number; step: number; was: number }
  /** Flowers planted, added at the end of the garden. */
  | { epoch: number; added: Point[] }
  /** Flowers pulled up, in the order they went: where each one was, and what it was. */
  | { epoch: number; removed: { at: number; point: Point }[] };

export type CellsState = {
  points: Point[];
  /** Which garden the dots started from ("own" once the learner cleared it). */
  garden: Garden;
  layers: number;
  /** Cells in each layer. */
  cells: number;
  /** The bend of each layer, input side first (always LIMITS.layers.max long). */
  bends: Bend[];
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** What a tap does: plant group 0 or 1, or pull flowers up (ERASER). */
  brush: number;
  learning: boolean;
  /** Practice rounds so far, so a shared link can replay the run to the same moment. */
  epochs: number;
  /** Which try this is: a new try starts the cells from fresh guesses. */
  attempt: number;
  /** Every change made during this try's practice, oldest first. */
  log: Change[];
};

/** A recorded moment, labelled with the run (team and try) it belongs to (MLP-05). */
export type CellsFrame = TimelineFrame & Snapshot & { run: string };

export const LIMITS = { layers: { min: 1, max: 4 }, cells: { min: 1, max: 8 } };
/** The garden holds this many flowers at most (MLP-04). */
export const MAX_POINTS = 400;
/** The brush value that pulls flowers up instead of planting. */
export const ERASER = 2;
const STEP_RANGE = { min: 0.005, max: 0.1 };
/** A spiral whose two arms wind around each other more than once. */
const SPIRAL_SPIN = 9;
const DATASET: Record<Exclude<Garden, "own">, DatasetName> = {
  blobs: "blobs",
  ring: "circles",
  spiral: "spiral",
};
export const SEED = 7;

/** The learning rate a "How big a step" dial position stands for. */
export const stepSize = (dial: number) => STEP_RANGE.min + dial * (STEP_RANGE.max - STEP_RANGE.min);
export const optimiser = (dial: number) => ({
  kind: "adam" as const,
  learningRate: stepSize(dial),
});

/** Coordinates rounded so a shared link stays short. */
const round = (value: number) => Math.round(value * 1000) / 1000;

export function plant(garden: Garden): Point[] {
  if (garden === "own") return [];
  return makeDataset(DATASET[garden], {
    count: 160,
    noise: 0.03,
    seed: 3,
    spin: SPIRAL_SPIN,
  }).map(({ x, y, label }) => ({ x: round(x), y: round(y), label }));
}

export const roundPoint = ({ x, y, label }: Point): Point => ({ x: round(x), y: round(y), label });

type Shape = Pick<CellsState, "layers" | "cells" | "bends">;

/** Hidden layer sizes: the team's shape, as the companion model stores it. */
export const hiddenOf = ({ layers, cells }: Pick<CellsState, "layers" | "cells">) =>
  Array.from({ length: layers }, () => cells);

export const bendsOf = ({ layers, bends }: Pick<CellsState, "layers" | "bends">): Bend[] =>
  Array.from({ length: layers }, (_, index) => bends[index] ?? "tanh");

export function modelOf(state: Shape): ModelSpec {
  return {
    sizes: [2, ...hiddenOf(state), 1],
    activation: bendsOf(state),
    loss: "binaryCrossEntropy",
  };
}

/** Which run a moment belongs to: the team's shape and bends, and the try. */
export const runKey = (state: Shape & Pick<CellsState, "attempt">) =>
  `${state.attempt}:${state.layers}x${state.cells}:${bendsOf(state).join(",")}`;

/** True when `frame` was recorded by the run `state` describes, not an earlier one. */
export const isThisRun = (state: CellsState, frame: CellsFrame | undefined): frame is CellsFrame =>
  frame !== undefined && frame.run === runKey(state);

/** A team of just one cell. */
export const isSingleCell = ({ layers, cells }: Pick<CellsState, "layers" | "cells">) =>
  layers * cells === 1;

export const teamSize = ({ layers, cells }: Pick<CellsState, "layers" | "cells">) => layers * cells;

/** There is something to learn: at least two flowers, and both kinds (MLP-03). */
export const canLearn = (points: readonly Point[]) =>
  points.length >= 2 &&
  points.some(({ label }) => label === 0) &&
  points.some(({ label }) => label === 1);

/** The planted spiral, still (almost) whole: a few flowers pulled up do not make it easier. */
export const isSpiral = ({ garden, points }: Pick<CellsState, "garden" | "points">) =>
  garden === "spiral" && points.length >= 150;

/** New flowers planted, as many as still fit; `full` when some did not (MLP-04). */
export function plantInto(points: Point[], batch: readonly Point[]) {
  const room = Math.max(0, MAX_POINTS - points.length);
  return {
    points: room > 0 && batch.length > 0 ? [...points, ...batch.slice(0, room)] : points,
    full: batch.length > room,
  };
}

export function applyChange(points: readonly Point[], change: Change): Point[] {
  if ("added" in change) return [...points, ...change.added];
  if ("removed" in change) {
    const next = [...points];
    for (const { at } of change.removed) next.splice(at, 1);
    return next;
  }
  return [...points];
}

function undoChange(points: readonly Point[], change: Change): Point[] {
  if ("added" in change) return points.slice(0, points.length - change.added.length);
  if ("removed" in change) {
    const next = [...points];
    for (const { at, point } of [...change.removed].reverse()) next.splice(at, 0, point);
    return next;
  }
  return [...points];
}

/** The garden and step the try's practice began with, worked back from now through the log. */
export function beginning({ points, step, log }: Pick<CellsState, "points" | "step" | "log">) {
  let garden: Point[] = points;
  let dial = step;
  for (const change of [...log].reverse()) {
    garden = undoChange(garden, change);
    if ("was" in change) dial = change.was;
  }
  return { points: garden, step: dial };
}

/** The log as the engine replays it: the whole garden or step at each change's round. */
export function scheduleOf(state: Pick<CellsState, "points" | "step" | "log">): ScheduledChange[] {
  let garden = beginning(state).points;
  return state.log.map((change) => {
    if ("was" in change) return { epoch: change.epoch, optimiser: optimiser(change.step) };
    garden = applyChange(garden, change);
    return { epoch: change.epoch, data: toSamples(garden) };
  });
}

/**
 * The two kinds of change a learner makes to the garden in one go: flowers added at the end, or
 * flowers pulled up. Null when `next` is neither (a new garden, which starts a new try).
 */
export function gardenChange(
  before: readonly Point[],
  next: readonly Point[],
):
  | Omit<Extract<Change, { added: Point[] }>, "epoch">
  | Omit<Extract<Change, { removed: unknown }>, "epoch">
  | null {
  if (next.length > before.length && before.every((point, index) => next[index] === point))
    return { added: next.slice(before.length) };
  if (next.length < before.length) {
    const removed: { at: number; point: Point }[] = [];
    let kept = 0;
    for (let index = 0; index < before.length; index += 1) {
      const point = before[index] as Point;
      if (next[kept] === point) kept += 1;
      else removed.push({ at: kept, point });
    }
    if (kept === next.length) return { removed };
  }
  return null;
}

const readers = new Map<string, FieldReader>();
/** One forward-pass reader per team shape, shared by the scene, missions and description. */
export function readerFor(model: ModelSpec): FieldReader {
  const key = `${model.sizes.join("-")}:${String(model.activation)}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createFieldReader(model);
    readers.set(key, reader);
  }
  return reader;
}

/** How many flowers the team at `params` puts on the right side of its fences. */
export function rightCount(state: CellsState, params: ArrayLike<number>): number {
  const { inputs } = toSamples(state.points);
  const chances = readerFor(modelOf(state))(params, inputs);
  return state.points.reduce(
    (right, { label }, index) => right + Number((chances[index] ?? 0.5) > 0.5 === (label === 1)),
    0,
  );
}

/**
 * True when some layer of cut-off cells says nothing at all for every flower: nothing gets
 * through it, and no mistake can travel back through it to wake the cells up.
 */
export function hasQuietLayer(state: CellsState, params: ArrayLike<number>): boolean {
  if (state.points.length === 0) return false;
  const model = modelOf(state);
  const { inputs, count } = toSamples(state.points);
  const layers = readerFor(model).hidden(params, inputs);
  const bends = bendsOf(state);
  return layers.some(
    (outputs, index) =>
      bends[index] === "relu" && outputs.every((value) => value === 0) && count > 0,
  );
}

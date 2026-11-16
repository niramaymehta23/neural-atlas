/**
 * The garden and the team of cells: the lesson's state, its starting gardens and the network
 * it describes. The training itself runs in the ModelEngine worker.
 */
import { makeDataset, type DatasetName, type Point } from "@/data/datasets";
import type { ModelSpec, Snapshot } from "@/engine/model/protocol";
import type { TimelineFrame } from "@/platform/contract";

export const GARDENS = ["blobs", "ring", "spiral", "own"] as const;
export type Garden = (typeof GARDENS)[number];

export type CellsState = {
  points: Point[];
  /** Which garden the dots started from ("own" once the learner cleared it). */
  garden: Garden;
  layers: number;
  /** Cells in each layer. */
  cells: number;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** The group new dots join. */
  brush: number;
  learning: boolean;
  /** Practice rounds so far, so a shared link can replay the run to the same moment. */
  epochs: number;
  /** Which try this is: a new try starts the cells from fresh guesses. */
  attempt: number;
};

export type CellsFrame = TimelineFrame & Snapshot;

export const LIMITS = { layers: { min: 1, max: 4 }, cells: { min: 1, max: 8 } };
const STEP_RANGE = { min: 0.005, max: 0.1 };
/** A spiral whose two arms wind around each other more than once. */
const SPIRAL_SPIN = 9;
const DATASET: Record<Exclude<Garden, "own">, DatasetName> = {
  blobs: "blobs",
  ring: "circles",
  spiral: "spiral",
};

/** The learning rate a "How big a step" dial position stands for. */
export const stepSize = (dial: number) => STEP_RANGE.min + dial * (STEP_RANGE.max - STEP_RANGE.min);

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

/** Hidden layer sizes: the team's shape, as the companion model stores it. */
export const hiddenOf = ({ layers, cells }: Pick<CellsState, "layers" | "cells">) =>
  Array.from({ length: layers }, () => cells);

export function modelOf(state: Pick<CellsState, "layers" | "cells">): ModelSpec {
  return { sizes: [2, ...hiddenOf(state), 1], activation: "tanh", loss: "binaryCrossEntropy" };
}

/** A team of just one cell. */
export const isSingleCell = ({ layers, cells }: Pick<CellsState, "layers" | "cells">) =>
  layers * cells === 1;

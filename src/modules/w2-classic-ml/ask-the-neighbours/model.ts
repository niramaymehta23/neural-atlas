import type { Point } from "@/data/datasets";
import { gridInputs } from "@/data/datasets";
import { fieldOf } from "@/engine/ml/field";
import { knnClassifier, vote } from "@/engine/ml/knn";
import { plantGarden } from "@/features/classic/garden";
import { rememberLast } from "@/features/classic/memo";

export const GARDENS = ["town", "moons", "own"] as const;
export type Garden = (typeof GARDENS)[number];
/** A tap drops the new family in (the other brushes plant fans or move them out). */
export const ASK = 3;
export const LIMITS = { neighbours: { min: 1, max: 15 } };
/** "Ask so few that one odd neighbour decides": this few or fewer… */
export const FEW = 3;
/** …and the wider street, this many nearest, says otherwise. */
export const STREET = 9;
/** The guess is about turning the dial this far. */
export const MANY = 9;
export const FIELD = 48;
const EDGE_GRID = 32;

export type Spot = { x: number; y: number };
export type NeighboursState = {
  garden: Garden;
  points: Point[];
  brush: number;
  neighbours: number;
  closeness: number;
  /** Where the new family is, or null before the first drop. */
  family: Spot | null;
};

/**
 * The town: two neighbourhoods of fans, with one odd fan living in each other's street, so asking
 * one neighbour can go wrong.
 */
export function plantTown(garden: Garden): Point[] {
  if (garden === "own") return [];
  if (garden === "moons") return plantGarden("moons", 3);
  return [
    ...plantGarden("blobs", 2),
    { x: 0.42, y: 0.3, label: 1 },
    { x: -0.3, y: -0.44, label: 0 },
  ];
}

/** The power distances are raised to: 0 (everyone the same) to 1 (one over distance squared). */
export const closenessPower = (closeness: number) => closeness;

export function askAt(state: NeighboursState, spot: Spot, neighbours = state.neighbours) {
  return vote(state.points, spot.x, spot.y, neighbours, closenessPower(state.closeness));
}

/** The vote at the new family's spot, or null before it moves in or with nobody to ask. */
export function familyVote(state: NeighboursState) {
  if (!state.family || state.points.length === 0) return null;
  return askAt(state, state.family);
}

const GRID = gridInputs(FIELD);

/** The map coloured by the vote at every spot. */
export const townField = rememberLast(
  (points: readonly Point[], neighbours: number, closeness: number): Float32Array | null =>
    points.length === 0
      ? null
      : fieldOf(knnClassifier(points, neighbours, closenessPower(closeness)), GRID, 2),
);

/** How long the edge between the two teams' areas is, counted in grid steps. */
export const edgeLength = rememberLast(
  (points: readonly Point[], neighbours: number, closeness: number): number => {
    const classify = knnClassifier(points, neighbours, closenessPower(closeness));
    const team = (row: number, column: number) => {
      const [, owls = 0] = classify(
        ((column + 0.5) / EDGE_GRID) * 2 - 1,
        1 - ((row + 0.5) / EDGE_GRID) * 2,
      );
      return owls > 0.5 ? 1 : 0;
    };
    const teams = Array.from({ length: EDGE_GRID }, (_, row) =>
      Array.from({ length: EDGE_GRID }, (_, column) => team(row, column)),
    );
    let edges = 0;
    for (let row = 0; row < EDGE_GRID; row += 1)
      for (let column = 0; column < EDGE_GRID; column += 1) {
        const here = teams[row]?.[column];
        if (column + 1 < EDGE_GRID && here !== teams[row]?.[column + 1]) edges += 1;
        if (row + 1 < EDGE_GRID && here !== teams[row + 1]?.[column]) edges += 1;
      }
    return edges;
  },
);

/** True when a lone odd neighbour decided: few asked, and the wider street says the other team. */
export function oddOneDecided(state: NeighboursState): boolean {
  const asked = familyVote(state);
  if (!asked || !state.family || state.neighbours > FEW || state.points.length < STREET)
    return false;
  const street = askAt({ ...state, closeness: 0 }, state.family, STREET);
  return asked.winner !== street.winner;
}

/** The answer to the guess: how the edge changed from asking one neighbour to asking many. */
export function edgeChange(state: NeighboursState): "smoother" | "jagged" | "same" | null {
  const groups = new Set(state.points.map((point) => point.label));
  if (state.neighbours < MANY || groups.size < 2) return null;
  const many = edgeLength(state.points, state.neighbours, state.closeness);
  const one = edgeLength(state.points, 1, state.closeness);
  return many < one ? "smoother" : many > one ? "jagged" : "same";
}

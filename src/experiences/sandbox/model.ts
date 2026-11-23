import { makeDataset, gridInputs, DATASETS, type DatasetName, type Point } from "@/data/datasets";
import type { TileKind } from "@/design/encodings";
import { BOARD_AGENTS, BOARD_STEPS, type BoardAgent } from "@/engine/lab/board-run";
import { GARDEN_MODELS, GARDEN_STEPS, type GardenModel } from "@/engine/lab/garden-run";
import type { LabConfig } from "@/engine/lab/lab-run";
import { reachability, type Tile, type World } from "@/engine/rl/gridworld";
import { hasBothGroups, MAX_DOTS, parseDots, roundDot } from "@/features/classic/garden";
import { keepTiles, tilesFrom } from "@/features/rl/boards";
import { clampWhole, oneOf } from "@/platform/clamp";
import type { ExperienceSpec } from "../shell/use-experience";

export type GardenName = DatasetName | "own";
export const GARDENS: readonly GardenName[] = [...DATASETS, "own"];
export const BOARD_LAYOUTS = {
  kitchen: ["....~G", ".##.#.", "..~...", ".#..#.", "S....."],
  corridor: [".....G", ".#####", "......", "#####.", "S....."],
  cliff: ["......", "......", "......", "......", "S~~~~G"],
  open: ["......", "...G..", "......", "......", "S....."],
} as const;
export type BoardName = keyof typeof BOARD_LAYOUTS | "own";
export const BOARDS: readonly BoardName[] = [
  ...(Object.keys(BOARD_LAYOUTS) as (keyof typeof BOARD_LAYOUTS)[]),
  "own",
];
export const COLUMNS = 6;
export const ROWS = 5;
/** The start sits at the bottom left of every board. */
export const START = COLUMNS * (ROWS - 1);

export type SandboxState = {
  place: "garden" | "board";
  garden: GardenName;
  /** The learner's own dots. */
  points: Point[];
  brush: number;
  model: GardenModel;
  board: BoardName;
  /** The learner's own board. */
  tiles: Tile[];
  boardBrush: Tile;
  agent: BoardAgent;
  /** Which dots are drawn, and which way chance falls. */
  seed: number;
  /** Steps practised. */
  steps: number;
  running: boolean;
};

export const DOTS = 120;
const FRESH_DOTS = 200;
const FRESH_SEED = 1000;
export const MOST_SEEDS = 99;
/** Spots per side of the painted field. */
export const RESOLUTION = 40;
const SPOTS = gridInputs(RESOLUTION);
/** How far each garden's dots stray: enough overlap that a perfect score means cramming. */
const NOISE: Record<DatasetName, number> = {
  blobs: 0.12,
  moons: 0.15,
  circles: 0.1,
  xor: 0.08,
  spiral: 0.03,
};
/** The arms wind most of the way round, so a straight fence is no use. */
const SPIN = 4.4;
/** A whole run is watched for about this long, however many steps it has. */
const WATCH_SECONDS = 12;

const plant = (name: DatasetName, count: number, seed: number): Point[] =>
  makeDataset(name, { count, noise: NOISE[name], seed, classes: 2, spin: SPIN }).map(roundDot);

export function dotsOf({ garden, points, seed }: Pick<SandboxState, "garden" | "points" | "seed">) {
  return garden === "own" ? points : plant(garden, DOTS, seed);
}

/** New dots from the same garden; the learner's own garden is judged on itself. */
export function freshDotsOf(state: Pick<SandboxState, "garden" | "points" | "seed">) {
  return state.garden === "own"
    ? state.points
    : plant(state.garden, FRESH_DOTS, state.seed + FRESH_SEED);
}

export const tilesOf = ({
  board,
  tiles,
}: Pick<SandboxState, "board" | "tiles">): readonly Tile[] =>
  board === "own" ? tiles : tilesFrom(BOARD_LAYOUTS[board]);

export const worldOf = (state: Pick<SandboxState, "board" | "tiles">): World => ({
  columns: COLUMNS,
  rows: ROWS,
  tiles: tilesOf(state),
  start: START,
});

export const boardTrouble = (state: Pick<SandboxState, "board" | "tiles">) => {
  const found = reachability(worldOf(state));
  return found === "reachable" ? null : found;
};

export const mostSteps = (state: Pick<SandboxState, "place" | "model" | "agent">) =>
  state.place === "garden" ? GARDEN_STEPS[state.model] : BOARD_STEPS[state.agent];

export const stepsPerSecond = (state: Pick<SandboxState, "place" | "model" | "agent">) =>
  Math.max(1, mostSteps(state) / WATCH_SECONDS);

/** The lesson each learner comes from, for its idea card. */
export const IDEAS: Record<GardenModel | BoardAgent, string> = {
  line: "splitting-into-groups",
  team: "stacking-cells",
  bigTeam: "it-can-draw-anything",
  neighbours: "ask-the-neighbours",
  questions: "twenty-questions",
  crowd: "wisdom-of-the-crowd",
  relay: "the-mistake-relay",
  road: "the-widest-road",
  scores: "scoring-every-move",
  habits: "nudging-habits",
  planner: "good-places-to-be",
  coach: "player-and-coach",
  wanderer: "new-or-favourite",
};

/** The parts of the state a run depends on. */
export type RunState = Pick<
  SandboxState,
  "place" | "garden" | "points" | "model" | "board" | "tiles" | "agent" | "seed"
>;

/** What to practise, or null while there is nothing to learn from. */
export function configOf(state: RunState): LabConfig | null {
  if (state.place === "board")
    return { kind: "board", agent: state.agent, world: worldOf(state), seed: state.seed };
  const dots = dotsOf(state);
  if (!hasBothGroups(dots)) return null;
  return {
    kind: "garden",
    model: state.model,
    dots,
    fresh: freshDotsOf(state),
    spots: SPOTS,
    seed: state.seed,
  };
}

/** Everything a run depends on, as one string. */
export const runKeyOf = (state: RunState) =>
  JSON.stringify(
    state.place === "board"
      ? [state.place, state.agent, state.seed, tilesOf(state)]
      : [
          state.place,
          state.model,
          state.seed,
          state.garden,
          state.garden === "own" && state.points,
        ],
  );

/** A change that starts a new run: nothing practised yet, and not practising. */
export const afresh = <T extends Partial<SandboxState>>(change: T) => ({
  ...change,
  steps: 0,
  running: false,
});

const initialState: SandboxState = {
  place: "garden",
  garden: "circles",
  points: [],
  brush: 0,
  model: "team",
  board: "kitchen",
  tiles: tilesFrom(BOARD_LAYOUTS.kitchen),
  boardBrush: "wall",
  agent: "scores",
  seed: 1,
  steps: 0,
  running: false,
};

export const BRUSHES: readonly Extract<TileKind, Tile>[] = [
  "floor",
  "wall",
  "trap",
  "coin",
  "goal",
];

export const sandbox: ExperienceSpec<SandboxState> = {
  id: "sandbox",
  initialState,
  parseState: (saved, initial) => {
    const place = oneOf(saved.place, ["garden", "board"] as const, initial.place);
    const model = oneOf(saved.model, GARDEN_MODELS, initial.model);
    const agent = oneOf(saved.agent, BOARD_AGENTS, initial.agent);
    return {
      place,
      garden: oneOf(saved.garden, GARDENS, initial.garden),
      points: parseDots(saved.points, 2, MAX_DOTS),
      brush: clampWhole(saved.brush, 0, 2),
      model,
      board: oneOf(saved.board, BOARDS, initial.board),
      tiles: keepTiles(saved.tiles, initial.tiles, START),
      boardBrush: oneOf(saved.boardBrush, BRUSHES, initial.boardBrush),
      agent,
      seed: clampWhole(saved.seed, 1, MOST_SEEDS),
      steps: clampWhole(saved.steps, 0, mostSteps({ place, model, agent })),
      // A link shows where a run had got to; it never opens running.
      running: false,
    };
  },
};

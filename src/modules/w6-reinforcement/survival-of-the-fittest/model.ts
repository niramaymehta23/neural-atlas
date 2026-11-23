/**
 * Survival of the fittest: draw a racetrack, and a population of little cars learns to drive it
 * by breeding. Every car has three feelers and a tiny brain; the cars that get furthest round
 * the track become the parents of the next generation, whose brains are changed copies of
 * theirs. A run is a pure function of the track, the dials and the seed (which set of cars), so a
 * link replays it exactly. The breeding itself is the engine's seeded `breed`.
 */
import { breed, lapOf, type Lap, type Track } from "@/engine/rl/racers";
import type { TimelineFrame } from "@/platform/contract";

export const COLUMNS = 10;
export const ROWS = 7;
/** Bottom row, a little right of the middle: every car starts here, heading right. */
export const START = 55;
/** Generations in every run. */
export const GENERATIONS = 50;
/** Cars 0 come from this seed; "New cars" moves on one. */
export const SEED = 1;

export const ROAD = "#";
export const GRASS = ".";

const track = (rows: string[]) => rows.join("").replace("S", ROAD);

/** Ready-made tracks, each a road square ("#") or grass (".") per square, row by row. */
export const TRACKS = {
  twisty: track([
    "..........",
    ".####.....",
    ".#..#.###.",
    ".#..###.#.",
    ".#......#.",
    ".####S###.",
    "..........",
  ]),
  steps: track([
    "..........",
    "....#####.",
    "....#...#.",
    ".####...#.",
    ".#......#.",
    ".####S###.",
    "..........",
  ]),
  loop: track([
    "..........",
    ".########.",
    ".#......#.",
    ".#......#.",
    ".#......#.",
    ".####S###.",
    "..........",
  ]),
} as const;
export type TrackName = keyof typeof TRACKS;
export const TRACK_NAMES = Object.keys(TRACKS) as TrackName[];

export const CARS = { min: 4, max: 40 };
export const DEFAULT_CARS = 30;
export const DEFAULT_CHANGE = 0.2;

/**
 * From here up on "How much each child changes" every child is nearly a brand-new random car,
 * and nothing improves. Measured (Twisty, 30 cars, 50 races, cars 0–19): at 0.9 and at the top
 * of the dial the last race's best car never got more than 8 squares further than the first
 * race's best; at the starting 0.2 every one of the twenty got at least 94 squares further (about
 * four laps). On the easy Big loop a brand-new random car sometimes drives well by luck, so
 * there the top of the dial can still find a good driver.
 */
export const WILD_CHANGE = 0.9;
/** No more than this many squares (half a lap of Twisty) further than the first race's best: no real improvement. */
export const STALL = 12;
/** Below this on the dial every child is an exact copy of its parent. */
export const COPIES = 0.005;

export type Brush = "road" | "grass";

export type RaceState = {
  /** The track, a road ("#") or grass (".") character per square, row by row. */
  road: string;
  brush: Brush;
  /** "How much each child changes", 0 (exact copies) – 1 (brand-new random cars). */
  change: number;
  /** "Cars per generation", a whole number. */
  cars: number;
  /** Which first generation: "New cars" moves on one (a new seed). */
  attempt: number;
  /** Runs asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

export type RaceFrame = TimelineFrame & {
  key: string;
  /** 0 for the first generation. */
  generation: number;
  /** Where each car was along its drive, x and y in turn, in squares. */
  trails: Float32Array[];
  /** Road squares each car got along the track. */
  progress: number[];
  /** Whether each car left the road (rather than running out of time). */
  crashed: boolean[];
  /** Which car got furthest. */
  best: number;
  /** How far the best car got, in road squares. */
  furthest: number;
  /** How far the first generation's best car got. */
  firstFurthest: number;
  /** Road squares once round the track. */
  lap: number;
};

/** A track string made safe: the right length, only road or grass, the start always road. */
export function cleanRoad(road: string): string {
  return Array.from({ length: COLUMNS * ROWS }, (_, at) =>
    at === START || road[at] === ROAD ? ROAD : GRASS,
  ).join("");
}

export const trackOf = (road: string): Track => ({
  columns: COLUMNS,
  rows: ROWS,
  road: Array.from({ length: COLUMNS * ROWS }, (_, at) => at === START || road[at] === ROAD),
  start: START,
});

/** Whether the track has a way round from the start back to it. */
export const lapFor = (road: string): Lap => lapOf(trackOf(road));
export const hasWayRound = (road: string) => lapFor(road).status === "ok";

export const keyOf = ({
  road,
  change,
  cars,
  attempt,
}: Pick<RaceState, "road" | "change" | "cars" | "attempt">) =>
  `${road}|${change}|${cars}|${attempt}`;

/**
 * Every generation of the run `state` describes, one frame each, with a `null` (a pause point
 * that records nothing) after every car, so no slice works out more than one car's drive.
 */
export function* raceRun(state: RaceState): Generator<RaceFrame | null> {
  const key = keyOf(state);
  const lap = lapFor(state.road);
  if (lap.status !== "ok") return;
  let firstFurthest = 0;
  for (const item of breed(
    trackOf(state.road),
    { cars: Math.round(state.cars), change: state.change },
    SEED + state.attempt,
    GENERATIONS,
  )) {
    if (item === "car") {
      yield null;
      continue;
    }
    const furthest = item.drives[item.best]?.progress ?? 0;
    if (item.index === 0) firstFurthest = furthest;
    yield {
      epoch: item.index,
      // Lower is better on the timeline's little line: squares short of the best possible.
      loss: -furthest,
      key,
      generation: item.index,
      trails: item.drives.map((drive) => drive.trail),
      progress: item.drives.map((drive) => drive.progress),
      crashed: item.drives.map((drive) => drive.crashed),
      best: item.best,
      furthest,
      firstFurthest,
      lap: lap.length,
    };
  }
}

export const isFinished = (state: RaceState, frame: RaceFrame | undefined): frame is RaceFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.generation === GENERATIONS - 1;

/** How much further the best car got than the first generation's best. */
export const gainOf = (frame: Pick<RaceFrame, "furthest" | "firstFurthest">) =>
  frame.furthest - frame.firstFurthest;

/**
 * Cars that learn to drive a drawn track by breeding, not by being taught (evolution strategies,
 * neuroevolution). A track is a grid of road squares with a start square; cars set off from it
 * heading right. Each car has three feelers (ahead-left, ahead, ahead-right) that measure how far
 * the road goes, and a tiny brain (three feelers → a few hidden cells → how hard to steer). A car
 * drives at a steady speed until its middle leaves the road or its time runs out; how far it got
 * along the track, in road squares in order, is its score. Each generation the best quarter of
 * the cars become parents, and the whole next generation is their children: each a blend of its
 * parent's brain and a brand-new random one, from an exact copy to a completely new car. Pure
 * and seeded: the same track, settings and seed give the same cars, generation after generation.
 */
import { createRandom, type Random } from "../random";

export type Track = {
  columns: number;
  rows: number;
  /** Row by row from the top, `columns` per row: true for road. */
  road: readonly boolean[];
  /** The square every car starts on, heading right. */
  start: number;
};

/** How many road squares along the track each square is, or why there is no way round. */
export type Lap =
  | {
      status: "ok";
      /** Squares along from the start (0) for road squares on the way round; −1 elsewhere. */
      along: Int16Array;
      /** Road squares once round the shortest way. */
      length: number;
    }
  | { status: "no-start" | "no-way-round" };

/**
 * The way round a track: the start and the squares either side of it must be road, and a road
 * from the square ahead of the start must lead back to the square behind it without crossing the
 * start. Each square's place along the track is its shortest road distance from the start
 * going forwards.
 */
export function lapOf(track: Track): Lap {
  const { columns, rows, road, start } = track;
  const column = start % columns;
  if (!road[start]) return { status: "no-start" };
  const ahead = column + 1 < columns ? start + 1 : -1;
  const behind = column > 0 ? start - 1 : -1;
  if (ahead < 0 || behind < 0 || !road[ahead] || !road[behind]) return { status: "no-way-round" };
  const along = new Int16Array(road.length).fill(-1);
  along[start] = 0;
  along[ahead] = 1;
  const waiting = [ahead];
  for (let at = 0; at < waiting.length; at += 1) {
    const cell = waiting[at] ?? ahead;
    const row = Math.floor(cell / columns);
    const col = cell % columns;
    const next = [
      row > 0 ? cell - columns : -1,
      col + 1 < columns ? cell + 1 : -1,
      row + 1 < rows ? cell + columns : -1,
      col > 0 ? cell - 1 : -1,
    ];
    for (const neighbour of next) {
      if (neighbour < 0 || !road[neighbour] || (along[neighbour] ?? -1) >= 0) continue;
      along[neighbour] = (along[cell] ?? 0) + 1;
      waiting.push(neighbour);
    }
  }
  const back = along[behind] ?? -1;
  if (back < 0) return { status: "no-way-round" };
  return { status: "ok", along, length: back + 1 };
}

/** Feelers point this far either side of straight ahead (radians). */
export const FEELER_ANGLE = 0.7;
/** A feeler sees this many squares at most. */
export const FEELER_LENGTH = 3;
/** Squares a car moves each step. */
export const SPEED = 0.25;
/** The sharpest turn in one step (radians), at full steering. */
export const TURN = 0.25;
/** A car stops after this many steps even if it is still on the road. */
export const MOST_STEPS = 360;
/** Hidden cells in a brain. */
export const HIDDEN = 4;
/** Numbers in one brain: feelers → hidden (weights then bias per cell), hidden → steering. */
export const BRAIN_SIZE = HIDDEN * 4 + HIDDEN + 1;
/** Positions kept along each car's drive: one every this many steps. */
export const TRAIL_EVERY = 4;
/** How spread out the first generation's brain numbers are. */
export const FIRST_SPREAD = 1;

const isRoad = (track: Track, x: number, y: number) => {
  if (x < 0 || y < 0 || x >= track.columns || y >= track.rows) return false;
  return track.road[Math.floor(y) * track.columns + Math.floor(x)] === true;
};

/**
 * How far the road goes from (x, y) along a direction, up to FEELER_LENGTH squares: walked one
 * grid line at a time (each square the ray crosses is checked once).
 */
export function feel(track: Track, x: number, y: number, angle: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let cellX = Math.floor(x);
  let cellY = Math.floor(y);
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const across = Math.abs(dx) < 1e-12 ? Infinity : Math.abs(1 / dx);
  const down = Math.abs(dy) < 1e-12 ? Infinity : Math.abs(1 / dy);
  let nextX = Math.abs(dx) < 1e-12 ? Infinity : (dx > 0 ? cellX + 1 - x : x - cellX) * across;
  let nextY = Math.abs(dy) < 1e-12 ? Infinity : (dy > 0 ? cellY + 1 - y : y - cellY) * down;
  for (;;) {
    const travelled = Math.min(nextX, nextY);
    if (travelled >= FEELER_LENGTH) return FEELER_LENGTH;
    if (nextX < nextY) {
      cellX += stepX;
      nextX += across;
    } else {
      cellY += stepY;
      nextY += down;
    }
    if (!isRoad(track, cellX + 0.5, cellY + 0.5)) return travelled;
  }
}

/** How hard to steer (−1 left … 1 right) from the three feelers, each 0–1. */
export function steer(brain: ArrayLike<number>, feelers: readonly number[]): number {
  let out = brain[BRAIN_SIZE - 1] ?? 0;
  for (let cell = 0; cell < HIDDEN; cell += 1) {
    const at = cell * 4;
    let sum = brain[at + 3] ?? 0;
    for (let input = 0; input < 3; input += 1)
      sum += (brain[at + input] ?? 0) * (feelers[input] ?? 0);
    out += (brain[HIDDEN * 4 + cell] ?? 0) * Math.tanh(sum);
  }
  return Math.tanh(out);
}

export type Drive = {
  /** Where the car was every TRAIL_EVERY steps, x and y in turn (in squares), the start first. */
  trail: Float32Array;
  /** Road squares it got along the track, in order (laps count in full). */
  progress: number;
  /** Steps it drove before it left the road or its time ran out. */
  steps: number;
  /** True when it left the road. */
  crashed: boolean;
  /** Its score: progress, with how long it stayed on the road breaking ties. */
  score: number;
};

/** One car's drive with `brain` from the start, heading right. */
export function drive(
  track: Track,
  lap: Extract<Lap, { status: "ok" }>,
  brain: ArrayLike<number>,
): Drive {
  let x = (track.start % track.columns) + 0.5;
  let y = Math.floor(track.start / track.columns) + 0.5;
  let heading = 0;
  let laps = 0;
  let along = 0;
  let cell = track.start;
  const trail: number[] = [x, y];
  const feelers = [0, 0, 0];
  let steps = 0;
  let crashed = false;
  for (; steps < MOST_STEPS;) {
    feelers[0] = feel(track, x, y, heading - FEELER_ANGLE) / FEELER_LENGTH;
    feelers[1] = feel(track, x, y, heading) / FEELER_LENGTH;
    feelers[2] = feel(track, x, y, heading + FEELER_ANGLE) / FEELER_LENGTH;
    heading += TURN * steer(brain, feelers);
    x += SPEED * Math.cos(heading);
    y += SPEED * Math.sin(heading);
    steps += 1;
    if (steps % TRAIL_EVERY === 0) trail.push(x, y);
    if (!isRoad(track, x, y)) {
      crashed = true;
      break;
    }
    const now = Math.floor(y) * track.columns + Math.floor(x);
    if (now === cell) continue;
    cell = now;
    const place = lap.along[now] ?? -1;
    // Forwards a square or two counts; backwards or a jump across the infield does not.
    if (place > along && place <= along + 3) along = place;
    else if (along >= lap.length - 3 && place >= 0 && place <= 2) {
      laps += 1;
      along = place;
    }
  }
  if (steps % TRAIL_EVERY !== 0) trail.push(x, y);
  const progress = laps * lap.length + along;
  return {
    trail: Float32Array.from(trail),
    progress,
    steps,
    crashed,
    score: progress + (0.5 * steps) / (MOST_STEPS + 1),
  };
}

export type BreedSettings = {
  /** Cars in every generation, at least 2. */
  cars: number;
  /** How much each child differs from its parent, 0 (an exact copy) to 1 (a brand-new random car). */
  change: number;
};

/** The share of each generation kept as parents (at least two cars). */
export const PARENT_SHARE = 0.25;

export type Generation = {
  /** 0 for the first, random generation. */
  index: number;
  /** Every car's drive, in the order they were made. */
  drives: Drive[];
  /** Which car drove furthest (the first on a tie). */
  best: number;
};

/** A brain of seeded random numbers. */
const randomBrain = (random: Random) =>
  Float64Array.from({ length: BRAIN_SIZE }, () => random.normal() * FIRST_SPREAD);

/**
 * A child of `parent`: a blend of the parent's brain and a brand-new random one. `change` 0 is an
 * exact copy, 1 a brand-new random car, and in between the parent's numbers shrink a little as
 * random ones are mixed in, so a child's numbers are spread just like a first-generation car's.
 */
export function childOf(parent: ArrayLike<number>, change: number, random: Random) {
  const mix = Math.min(1, Math.max(0, change));
  const keep = Math.sqrt(1 - mix * mix);
  return Float64Array.from(
    { length: BRAIN_SIZE },
    (_, at) => keep * (parent[at] ?? 0) + mix * random.normal() * FIRST_SPREAD,
  );
}

/**
 * Generation after generation of cars on one track. Yields `"car"` after every car's drive (so a
 * caller can pause between cars) and the finished generation after its last car. The next
 * generation is all children of this one's best quarter, each parent in turn from the best down;
 * no car lives on unchanged, so with too much change nothing carries over. A track with no way
 * round yields nothing.
 */
export function* breed(
  track: Track,
  settings: BreedSettings,
  seed: number,
  generations: number,
): Generator<"car" | Generation> {
  const lap = lapOf(track);
  if (lap.status !== "ok") return;
  const random = createRandom(seed);
  const cars = Math.max(2, Math.round(settings.cars));
  const change = Math.max(0, settings.change);
  let brains = Array.from({ length: cars }, () => randomBrain(random));
  for (let index = 0; index < generations; index += 1) {
    const drives: Drive[] = [];
    for (const brain of brains) {
      drives.push(drive(track, lap, brain));
      yield "car";
    }
    const ranked = drives
      .map((tried, at) => ({ at, score: tried.score }))
      .sort((a, b) => b.score - a.score || a.at - b.at);
    const best = ranked[0]?.at ?? 0;
    yield { index, drives, best };
    const parents = ranked
      .slice(0, Math.max(2, Math.round(cars * PARENT_SHARE)))
      .map(({ at }) => brains[at] ?? randomBrain(random));
    brains = Array.from({ length: cars }, (_, at) =>
      childOf(parents[at % parents.length] ?? randomBrain(random), change, random),
    );
  }
}

/** The best car's progress in every generation of a run, first to last (for tests and tuning). */
export function bestProgress(
  track: Track,
  settings: BreedSettings,
  seed: number,
  generations: number,
): number[] {
  const best: number[] = [];
  for (const item of breed(track, settings, seed, generations))
    if (item !== "car") best.push(item.drives[item.best]?.progress ?? 0);
  return best;
}

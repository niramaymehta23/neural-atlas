/**
 * Loopholes: the learner writes a tidy-up robot's reward with two dials and two switches; the
 * robot works out the plan that earns the most (exactly, in short slices) and its day plays on
 * the timeline, one action per moment. Three ways it finds to earn treats without tidying up are
 * loopholes the learner can collect.
 */
import {
  behaviourOf,
  createRoomSolver,
  dayOf,
  isLoophole,
  LOOPHOLES,
  type Behaviour,
  type Happening,
  type Loophole,
  type RewardRules,
  type Room,
  type RoomSquare,
} from "@/engine/rl/reward-design";
import type { TimelineFrame } from "@/platform/contract";

export type LoopholeState = {
  /** "Treat for putting the toy away", 0–1 on its dial. */
  boxTreat: number;
  /** "How much each move costs", 0–1 on its dial. */
  moveCost: number;
  /** "A treat each time it picks up the toy" switched on. */
  pickup: boolean;
  /** "A treat for each step that brings the toy closer to the box" switched on. */
  closer: boolean;
  /** Days asked for; 0 until the first. A link replays the last one. */
  runs: number;
  /** Loopholes found so far, in the order they were found. */
  found: Loophole[];
};

export type LoopholeFrame = TimelineFrame & {
  key: string;
  /** Actions taken so far today (this moment's included). */
  moves: number;
  /** Actions in the whole day. */
  length: number;
  cell: number;
  /** Where the toy is now: a square, carried (−1) or boxed (−2). */
  toy: number;
  happened: Happening;
  /** Treats minus costs so far today. */
  total: number;
  /** Squares visited so far, the start first. */
  path: number[];
  /** What the whole day came to (the same on every moment of the day). */
  behaviour: Behaviour;
};

const MARKS: Record<string, RoomSquare> = { "#": "wall", B: "bed", P: "puddle", X: "box" };
const LAYOUT = [".....B", "..#...", "..#...", ".P...X"];

/**
 * The bedroom: the robot wakes bottom left, beside the puddle; the toy lies across the room, the
 * toy box is in the far corner and the bed above it, so tidying up is a real walk.
 */
export const ROOM: Room = {
  columns: LAYOUT[0]?.length ?? 6,
  rows: LAYOUT.length,
  squares: LAYOUT.flatMap((row) => [...row].map((mark) => MARKS[mark] ?? "floor")),
  start: 18,
  toy: 10,
};

/** The dials' ranges. */
export const BOX_TREAT = 3;
export const MOVE_COST = 0.4;
/** What the two switches pay when on. */
export const PICKUP_TREAT = 0.5;
export const CLOSER_TREAT = 0.3;

export const rulesOf = (
  state: Pick<LoopholeState, "boxTreat" | "moveCost" | "pickup" | "closer">,
): RewardRules => ({
  boxTreat: Math.min(1, Math.max(0, state.boxTreat)) * BOX_TREAT,
  moveCost: Math.min(1, Math.max(0, state.moveCost)) * MOVE_COST,
  pickupTreat: state.pickup ? PICKUP_TREAT : 0,
  closerTreat: state.closer ? CLOSER_TREAT : 0,
});

export const keyOf = ({ boxTreat, moveCost, pickup, closer }: LoopholeState) =>
  `${boxTreat}|${moveCost}|${pickup}|${closer}`;

/** Sweeps worked out per breath: a few milliseconds' work. */
const SWEEPS_PER_BREATH = 20;

/**
 * The day `state` describes: first the plan is worked out (a breath, null, between batches of
 * sweeps), then one frame per action of the robot's day.
 */
export function* dayRun(state: LoopholeState): Generator<LoopholeFrame | null> {
  const rules = rulesOf(state);
  const solver = createRoomSolver(ROOM, rules);
  while (!solver.advance(SWEEPS_PER_BREATH)) yield null;
  const day = dayOf(ROOM, rules, solver);
  const behaviour = behaviourOf(day);
  const key = keyOf(state);
  const path = [ROOM.start];
  for (const [index, moment] of day.entries()) {
    path.push(moment.cell);
    yield {
      epoch: index + 1,
      loss: -moment.total,
      key,
      moves: index + 1,
      length: day.length,
      cell: moment.cell,
      toy: moment.toy,
      happened: moment.happened,
      total: moment.total,
      path: [...path],
      behaviour,
    };
  }
}

export const isFinished = (
  state: LoopholeState,
  frame: LoopholeFrame | undefined,
): frame is LoopholeFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.moves === frame.length;

/** The found list with a newly seen loophole added (unchanged if it is not one, or known). */
export function withFound(found: readonly Loophole[], behaviour: Behaviour): Loophole[] {
  if (!isLoophole(behaviour) || found.includes(behaviour)) return [...found];
  return [...found, behaviour];
}

export const ALL_LOOPHOLES = LOOPHOLES;
export type { Loophole };

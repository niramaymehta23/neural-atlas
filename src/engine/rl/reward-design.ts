/**
 * A tidy-up robot's day, planned exactly for a reward the learner writes. The robot walks a small
 * room, can grab or let go of one toy, and its day ends when it goes to bed or steps in the
 * puddle. Its plan is the best one for the reward as written (value iteration over every square ×
 * where the toy is), so whatever the reward pays for, it does: a treat for picking up makes it
 * pick up and put down forever; a treat for each step closer to the box makes it pace; moves that
 * cost too much make it end the day in the puddle. Pure; the solver works in resumable sweeps so
 * a page can spread it over several frames.
 */
import { MOVES } from "./gridworld";

export type RoomSquare = "floor" | "wall" | "bed" | "puddle" | "box";

export type Room = {
  columns: number;
  rows: number;
  squares: readonly RoomSquare[];
  /** Where the robot wakes up. */
  start: number;
  /** Where the toy lies in the morning. */
  toy: number;
};

/** What the learner's reward pays for. */
export type RewardRules = {
  /** Paid once when the toy goes into the box. */
  boxTreat: number;
  /** Taken for every action. */
  moveCost: number;
  /** Paid every time the robot picks the toy up (0: switched off). */
  pickupTreat: number;
  /** Paid for every step that brings the carried toy closer to the box (0: switched off). */
  closerTreat: number;
};

/** Stepping in the puddle ends the day wet. Going to bed ends it with nothing. */
export const PUDDLE = -1;
/** How much tomorrow's treats count against today's. */
export const CARE = 0.95;
/** Four moves (up, right, down, left), then grab or let go. */
export const ACTIONS = 5;
export const GRAB = 4;
/** A day is at most this many actions long. */
export const DAY = 40;

/** Where the toy is: a square, in the robot's hands, or in the box. */
export const CARRIED = -1;
export const BOXED = -2;

/** Toy places: every square, then carried, then boxed. */
const placeOf = (room: Room, toy: number) =>
  toy === CARRIED ? room.squares.length : toy === BOXED ? room.squares.length + 1 : toy;
const toyAt = (room: Room, place: number) =>
  place === room.squares.length ? CARRIED : place === room.squares.length + 1 ? BOXED : place;
const stateOf = (room: Room, cell: number, toy: number) =>
  cell * (room.squares.length + 2) + placeOf(room, toy);
export const stateCount = (room: Room) => room.squares.length * (room.squares.length + 2);

/** Squares from each square to the box, walking round walls (Infinity where it cannot). */
export function distancesToBox(room: Room): number[] {
  const far = room.squares.map(() => Infinity);
  const waiting: number[] = [];
  room.squares.forEach((square, cell) => {
    if (square === "box") {
      far[cell] = 0;
      waiting.push(cell);
    }
  });
  while (waiting.length > 0) {
    const cell = waiting.shift() ?? 0;
    for (let move = 0; move < MOVES.length; move += 1) {
      const next = step(room, cell, move);
      if (next !== cell && (far[next] ?? Infinity) > (far[cell] ?? 0) + 1) {
        far[next] = (far[cell] ?? 0) + 1;
        waiting.push(next);
      }
    }
  }
  return far;
}

/** Where a move from `cell` lands: walls and edges leave the robot where it is. */
export function step(room: Room, cell: number, move: number): number {
  const [dRow, dColumn] = MOVES[move] ?? MOVES[0];
  const row = Math.floor(cell / room.columns) + dRow;
  const column = (cell % room.columns) + dColumn;
  if (row < 0 || row >= room.rows || column < 0 || column >= room.columns) return cell;
  const next = row * room.columns + column;
  return room.squares[next] === "wall" ? cell : next;
}

export type Happening = "move" | "grab" | "drop" | "box" | "bed" | "puddle" | "nothing";

export type Outcome = {
  cell: number;
  toy: number;
  reward: number;
  done: boolean;
  happened: Happening;
  /** The step brought the carried toy closer to the box. */
  closer: boolean;
};

/** What one action does: always the same (the room is not slippery). */
export function act(
  room: Room,
  rules: RewardRules,
  far: readonly number[],
  cell: number,
  toy: number,
  action: number,
): Outcome {
  const cost = -rules.moveCost;
  if (action === GRAB) {
    if (toy === cell)
      return {
        cell,
        toy: CARRIED,
        reward: cost + rules.pickupTreat,
        done: false,
        happened: "grab",
        closer: false,
      };
    if (toy === CARRIED) {
      if (room.squares[cell] === "box")
        return {
          cell,
          toy: BOXED,
          reward: cost + rules.boxTreat,
          done: false,
          happened: "box",
          closer: false,
        };
      return { cell, toy: cell, reward: cost, done: false, happened: "drop", closer: false };
    }
    return { cell, toy, reward: cost, done: false, happened: "nothing", closer: false };
  }
  const next = step(room, cell, action);
  const closer = toy === CARRIED && (far[next] ?? Infinity) < (far[cell] ?? Infinity);
  const reward = cost + (closer ? rules.closerTreat : 0);
  const square = room.squares[next];
  if (square === "bed") return { cell: next, toy, reward, done: true, happened: "bed", closer };
  if (square === "puddle")
    return { cell: next, toy, reward: reward + PUDDLE, done: true, happened: "puddle", closer };
  return {
    cell: next,
    toy,
    reward,
    done: false,
    happened: next === cell ? "nothing" : "move",
    closer,
  };
}

/** True for squares the robot can be standing on at the start of an action. */
const canStand = (room: Room, cell: number) => {
  const square = room.squares[cell];
  return square === "floor" || square === "box";
};

/** A change smaller than this everywhere: the plan has settled. */
export const SETTLED = 1e-7;
const MOST_SWEEPS = 2000;

export type RoomSolver = {
  /** Sweeps until settled or `budget` sweeps have run; true once settled. */
  advance(budget: number): boolean;
  readonly settled: boolean;
  /** The best action from a square with the toy at `toy`. */
  best(cell: number, toy: number): number;
};

/** The exact plan for `rules`, worked out sweep by sweep (value iteration). */
export function createRoomSolver(room: Room, rules: RewardRules): RoomSolver {
  const far = distancesToBox(room);
  let values = new Float64Array(stateCount(room));
  let sweeps = 0;
  let settled = false;
  const places = room.squares.length + 2;
  const worth = (cell: number, toy: number, action: number) => {
    const outcome = act(room, rules, far, cell, toy, action);
    return (
      outcome.reward +
      (outcome.done ? 0 : CARE * (values[stateOf(room, outcome.cell, outcome.toy)] ?? 0))
    );
  };
  return {
    advance(budget) {
      for (let done = 0; done < budget && !settled; done += 1) {
        const next = new Float64Array(values.length);
        let change = 0;
        for (let cell = 0; cell < room.squares.length; cell += 1) {
          if (!canStand(room, cell)) continue;
          for (let place = 0; place < places; place += 1) {
            const toy = toyAt(room, place);
            let most = -Infinity;
            for (let action = 0; action < ACTIONS; action += 1)
              most = Math.max(most, worth(cell, toy, action));
            const at = stateOf(room, cell, toy);
            next[at] = most;
            change = Math.max(change, Math.abs(most - (values[at] ?? 0)));
          }
        }
        values = next;
        sweeps += 1;
        if (change < SETTLED || sweeps >= MOST_SWEEPS) settled = true;
      }
      return settled;
    },
    get settled() {
      return settled;
    },
    best(cell, toy) {
      let best = 0;
      let top = -Infinity;
      for (let action = 0; action < ACTIONS; action += 1) {
        const value = worth(cell, toy, action);
        if (value > top + 1e-9) {
          top = value;
          best = action;
        }
      }
      return best;
    },
  };
}

export type DayMoment = Outcome & { action: number; total: number };

/** The robot's day following the plan: every action and what it did, until bed, puddle or DAY. */
export function dayOf(room: Room, rules: RewardRules, solver: RoomSolver): DayMoment[] {
  const far = distancesToBox(room);
  const moments: DayMoment[] = [];
  let cell = room.start;
  let toy = room.toy;
  let total = 0;
  for (let taken = 0; taken < DAY; taken += 1) {
    const action = solver.best(cell, toy);
    const outcome = act(room, rules, far, cell, toy, action);
    total += outcome.reward;
    moments.push({ ...outcome, action, total });
    cell = outcome.cell;
    toy = outcome.toy;
    if (outcome.done) break;
  }
  return moments;
}

/** What the robot's day came to. The last three are loopholes: not what the reward meant. */
export const BEHAVIOURS = ["tidy", "sleeps", "wanders", "juggles", "paces", "puddle"] as const;
export type Behaviour = (typeof BEHAVIOURS)[number];
export const LOOPHOLES = ["juggles", "paces", "puddle"] as const satisfies readonly Behaviour[];
export type Loophole = (typeof LOOPHOLES)[number];

/** Picks-ups (or steps closer) in a day before it counts as a trick rather than a fluke. */
const REPEATS = 3;

export function behaviourOf(day: readonly DayMoment[]): Behaviour {
  const boxed = day.some((moment) => moment.happened === "box");
  const last = day.at(-1);
  // Even after tidying, jumping in the puddle to stop paying for moves is ending the day early.
  if (last?.happened === "puddle") return "puddle";
  if (!boxed && day.filter((moment) => moment.happened === "grab").length >= REPEATS)
    return "juggles";
  if (!boxed && day.filter((moment) => moment.closer).length >= REPEATS + 1) return "paces";
  if (boxed && last?.done) return "tidy";
  if (!boxed && last?.happened === "bed") return "sleeps";
  return "wanders";
}

export const isLoophole = (behaviour: Behaviour): behaviour is Loophole =>
  (LOOPHOLES as readonly string[]).includes(behaviour);

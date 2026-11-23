import {
  act,
  behaviourOf,
  BOXED,
  CARRIED,
  createRoomSolver,
  dayOf,
  distancesToBox,
  GRAB,
  type RewardRules,
  type Room,
} from "./reward-design";

/** A corridor: robot, toy, box, bed. */
const ROOM: Room = {
  columns: 5,
  rows: 1,
  squares: ["puddle", "floor", "floor", "box", "bed"],
  start: 1,
  toy: 2,
};
const FAIR: RewardRules = { boxTreat: 1, moveCost: 0.02, pickupTreat: 0, closerTreat: 0 };
const RIGHT = 1;

const dayFor = (rules: RewardRules) => {
  const solver = createRoomSolver(ROOM, rules);
  while (!solver.advance(50));
  return dayOf(ROOM, rules, solver);
};

describe("the tidy-up robot's room", () => {
  it("grabs, carries, boxes and pays exactly what the reward says", () => {
    const far = distancesToBox(ROOM);
    expect(far).toEqual([3, 2, 1, 0, 1]);
    expect(act(ROOM, FAIR, far, 2, 2, GRAB)).toMatchObject({ toy: CARRIED, happened: "grab" });
    const carried = act(ROOM, { ...FAIR, closerTreat: 0.3 }, far, 2, CARRIED, RIGHT);
    expect(carried).toMatchObject({ cell: 3, closer: true, reward: 0.3 - 0.02 });
    expect(act(ROOM, FAIR, far, 3, CARRIED, GRAB)).toMatchObject({ toy: BOXED, reward: 1 - 0.02 });
    expect(act(ROOM, FAIR, far, 3, BOXED, RIGHT)).toMatchObject({ done: true, happened: "bed" });
    expect(act(ROOM, FAIR, far, 1, 2, 3)).toMatchObject({ done: true, happened: "puddle" });
  });

  it("with a fair reward it tidies up and goes to bed", () => {
    const day = dayFor(FAIR);
    expect(day.map((moment) => moment.happened)).toEqual(["move", "grab", "move", "box", "bed"]);
    expect(behaviourOf(day)).toBe("tidy");
  });

  it("finds each loophole the reward leaves open", () => {
    expect(behaviourOf(dayFor({ ...FAIR, pickupTreat: 0.5 }))).toBe("juggles");
    expect(behaviourOf(dayFor({ ...FAIR, moveCost: 0.6 }))).toBe("puddle");
    // Pacing needs room to step away from the box and back.
    const wide: Room = {
      ...ROOM,
      columns: 6,
      squares: [...ROOM.squares.slice(0, 3), "floor", "box", "bed"],
      toy: 2,
    };
    const solver = createRoomSolver(wide, { ...FAIR, closerTreat: 0.3 });
    while (!solver.advance(50));
    expect(behaviourOf(dayOf(wide, { ...FAIR, closerTreat: 0.3 }, solver))).toBe("paces");
  });

  it("goes straight to bed when tidying earns nothing, and wanders when nothing counts", () => {
    expect(behaviourOf(dayFor({ ...FAIR, boxTreat: 0 }))).not.toBe("tidy");
    expect(behaviourOf(dayFor({ boxTreat: 0, moveCost: 0, pickupTreat: 0, closerTreat: 0 }))).toBe(
      "wanders",
    );
  });

  it("works out the same plan however its sweeps are sliced", () => {
    const whole = createRoomSolver(ROOM, FAIR);
    whole.advance(10_000);
    const sliced = createRoomSolver(ROOM, FAIR);
    while (!sliced.advance(3));
    expect(dayOf(ROOM, FAIR, sliced)).toEqual(dayOf(ROOM, FAIR, whole));
  });
});

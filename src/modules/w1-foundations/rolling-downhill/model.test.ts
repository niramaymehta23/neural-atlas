import { missions } from "./missions";
import {
  curvesUp,
  dialFor,
  firstToSettle,
  guessesAgainst,
  HEIGHTS,
  rollDown,
  slope,
  startsFor,
  STEPS,
  TOP,
  VALLEYS,
  type Valley,
} from "@/features/building/race/race";
import { placeMark, shownMarks, type DownhillFrame, type DownhillState } from "./model";

/** Steepest bend at each valley's bottom, so the steady walker's bound is 2 ÷ bend. */
const BEND: Partial<Record<Valley, number>> = { bowl: 3, ravine: 6 };

const state = (change: Partial<DownhillState>): DownhillState => ({
  valley: "bowl",
  step: 0.2,
  keepRolling: 0.9,
  start: { x: 0.6, z: 0.6 },
  runs: 1,
  marks: [],
  marksFor: 0,
  ...change,
});

const flyOff = missions[0];
const last = (change: Partial<DownhillState>) => rollDown(state(change)).at(-1);

describe("rolling downhill", () => {
  it.each(Object.entries(BEND))(
    "a step past the %s's stability bound sends the steady walker off the map",
    (valley, bend) => {
      const bound = 2 / bend;
      const above = rollDown(state({ valley: valley as Valley, step: dialFor(bound * 1.05) }));
      const below = rollDown(state({ valley: valley as Valley, step: dialFor(bound * 0.95) }));
      expect(above.at(-1)?.walkers[0]?.off).toBe(true);
      expect(below.at(-1)?.walkers[0]?.off).toBe(false);
      expect(flyOff.when(state({}), above.at(-1))).toBe(true);
      expect(flyOff.when(state({}), below.at(-1))).toBe(false);
    },
  );

  it("records every step and settles all three walkers with gentle steps", () => {
    for (const valley of VALLEYS) {
      const frames = rollDown(state({ valley, step: 0.15 }));
      expect(frames).toHaveLength(STEPS + 1);
      expect(frames.at(-1)?.walkers.every(({ off }) => !off)).toBe(true);
      expect(frames.at(-1)?.loss).toBeLessThan(frames[0]?.loss ?? 0);
    }
  });

  it("names a winner only once the run is over", () => {
    const frames = rollDown(state({}));
    expect(firstToSettle(frames[10])).toBeNull();
    expect(firstToSettle(frames.at(-1))).toBe("sgd");
  });

  describe("who settles first (DH-03)", () => {
    it("is nobody when every walker flies off", () => {
      const end = last({ valley: "pass", step: 1, start: { x: 0.99, z: 0.99 } });
      expect(end?.walkers.every(({ off }) => off)).toBe(true);
      expect(end?.settled).toEqual([null, null, null]);
      expect(firstToSettle(end)).toBe("none");
    });

    it("never counts a walker that flew off", () => {
      const end = last({ step: 0.7, start: { x: 0.75, z: 0.6 } });
      expect(end?.walkers[0]?.off).toBe(true);
      expect(firstToSettle(end)).not.toBe("sgd");
    });

    it("does not count resting on the flat top of a saddle as the bottom", () => {
      const frames = rollDown(state({ valley: "pass", step: 0.15, start: { x: 0, z: 0 } }));
      expect(frames.at(-1)?.walkers[0]).toMatchObject({ x: 0, z: 0, off: false });
      expect(frames.some(({ settled }) => settled[0] !== null)).toBe(false);
      expect(curvesUp("pass", { x: 0, z: 0 })).toBe(false);
      expect(curvesUp("pass", { x: 0, z: Math.sqrt(0.3) })).toBe(true);
    });

    it("calls it a tie when two settle on the same step", () => {
      const end = last({});
      const tied = { ...end, settled: [40, 40, 90] } as DownhillFrame;
      expect(firstToSettle(tied)).toBe("tie");
    });

    it("is nobody when no one has settled by the end", () => {
      const end = last({});
      expect(firstToSettle({ ...end, settled: [null, null, null] } as DownhillFrame)).toBe("none");
    });
  });

  describe("the fly-off mission (DH-04)", () => {
    it("does not fire when only the rolling ball rolls off with small steps", () => {
      const end = last({
        valley: "ravine",
        step: 0.19,
        keepRolling: 1,
        start: { x: 0.9, z: -0.9 },
      });
      expect(end?.walkers[1]?.off).toBe(true);
      expect(end?.walkers[0]?.off).toBe(false);
      expect(flyOff.when(state({}), end)).toBe(false);
    });

    it("does not fire from the ravine's corner with small steps", () => {
      const end = last({
        valley: "ravine",
        step: 0.19,
        keepRolling: 0.9,
        start: { x: 0.99, z: 0.99 },
      });
      expect(flyOff.when(state({}), end)).toBe(false);
    });

    it("replays slowly around the step the steady walker left", () => {
      const end = last({ step: 1 });
      expect(flyOff.replay.moment(end)).toBe(end?.offAt[0]);
      expect(flyOff.replay.framesPerSecond).toBeLessThanOrEqual(8);
      // Even a walker that leaves on the first step gets two seconds of replay.
      expect((1 + flyOff.replay.after) / flyOff.replay.framesPerSecond).toBeGreaterThanOrEqual(2);
    });
  });

  describe("the mistake curve (DH-06)", () => {
    it("counts a walker that flew off at the top of the map, so leaving never looks better", () => {
      const end = last({ valley: "pass", step: 1, start: { x: 0.99, z: 0.99 } });
      expect(end?.loss).toBeGreaterThanOrEqual(TOP.pass);
      for (const valley of VALLEYS) {
        for (let i = 0; i <= 20; i += 1)
          for (let j = 0; j <= 20; j += 1)
            expect(HEIGHTS[valley](i / 10 - 1, j / 10 - 1)).toBeLessThanOrEqual(TOP[valley]);
      }
    });

    it("never dips below zero on the bumpy field", () => {
      let lowest = Infinity;
      for (let i = 0; i <= 400; i += 1)
        for (let j = 0; j <= 400; j += 1)
          lowest = Math.min(lowest, HEIGHTS.bumpy(i / 200 - 1, j / 200 - 1));
      expect(lowest).toBeGreaterThanOrEqual(0);
    });
  });

  it("starts the three walkers a little apart, the steady walker on the chosen spot (DH-08)", () => {
    const starts = startsFor({ x: 0.6, z: 0.6 });
    expect(starts[0]).toEqual({ x: 0.6, z: 0.6 });
    for (let a = 0; a < starts.length; a += 1)
      for (let b = a + 1; b < starts.length; b += 1) {
        const [p, q] = [starts[a], starts[b]];
        expect(Math.hypot((p?.x ?? 0) - (q?.x ?? 0), (p?.z ?? 0) - (q?.z ?? 0))).toBeGreaterThan(
          0.15,
        );
      }
    const corner = startsFor({ x: -1, z: -1 });
    expect(corner.every(({ x, z }) => Math.abs(x) < 1 && Math.abs(z) < 1)).toBe(true);
    expect(new Set(corner.map(({ x, z }) => `${x},${z}`)).size).toBe(3);
  });

  describe("guessing where they stop (DH-02)", () => {
    it("places one guess per walker, for the next roll, and starts afresh after a roll", () => {
      let now = state({ runs: 2, marks: [], marksFor: 0 });
      now = { ...now, ...placeMark(now, { x: 0, z: 0 }) };
      now = { ...now, ...placeMark(now, { x: 0.1, z: 0 }) };
      expect(now.marks).toHaveLength(2);
      expect(now.marksFor).toBe(3);
      expect(shownMarks(now)).toHaveLength(2);
      // The roll happens: the guesses are locked to it and still shown.
      now = { ...now, runs: 3 };
      expect(shownMarks(now)).toHaveLength(2);
      // A new guess after the roll is for the next one, and starts from nothing.
      now = { ...now, ...placeMark(now, { x: 0.5, z: 0.5 }) };
      expect(now.marks).toEqual([{ x: 0.5, z: 0.5 }]);
      expect(now.marksFor).toBe(4);
      // Old guesses from long ago are not shown.
      expect(shownMarks({ ...now, runs: 9 })).toEqual([]);
    });

    it("compares each guess with where its walker stopped, once the roll is over", () => {
      const frames = rollDown(state({}));
      const end = frames.at(-1);
      const steady = end?.walkers[0] ?? { x: 0, z: 0 };
      const marks = [steady, { x: steady.x + 0.9, z: steady.z }];
      expect(guessesAgainst(marks, frames[5])).toEqual([null, null, null]);
      expect(guessesAgainst(marks, end)).toEqual(["close", "far", null]);
    });
  });

  it("feels the slope the right way round", () => {
    expect(slope("bowl", { x: 0.5, z: -0.5 })).toEqual({
      x: expect.closeTo(0.5, 5),
      z: expect.closeTo(-1.5, 5),
    });
  });

  it("is the same run every time", () => {
    expect(rollDown(state({ valley: "bumpy" }))).toEqual(rollDown(state({ valley: "bumpy" })));
  });
});

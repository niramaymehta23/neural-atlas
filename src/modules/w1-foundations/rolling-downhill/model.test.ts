import { missions } from "./missions";
import {
  dialFor,
  firstToSettle,
  rollDown,
  slope,
  STEPS,
  VALLEYS,
  type DownhillState,
  type Valley,
} from "./model";

/** Steepest bend at each valley's bottom, so the steady walker's bound is 2 ÷ bend. */
const BEND: Partial<Record<Valley, number>> = { bowl: 3, ravine: 6 };

const state = (change: Partial<DownhillState>): DownhillState => ({
  valley: "bowl",
  step: 0.2,
  keepRolling: 0.9,
  start: { x: 0.6, z: 0.6 },
  runs: 1,
  ...change,
});

const flyOff = missions[0];

describe("rolling downhill", () => {
  it.each(Object.entries(BEND))(
    "a step past the %s's stability bound sends the steady walker off the map",
    (valley, bend) => {
      const bound = 2 / bend;
      const above = rollDown(state({ valley: valley as Valley, step: dialFor(bound * 1.05) }));
      const below = rollDown(state({ valley: valley as Valley, step: dialFor(bound * 0.95) }));
      expect(above.at(-1)!.walkers[0]!.off).toBe(true);
      expect(below.at(-1)!.walkers[0]!.off).toBe(false);
      expect(flyOff.when(state({}), above.at(-1))).toBe(true);
      expect(flyOff.when(state({}), below.slice(0, 1)[0])).toBe(false);
    },
  );

  it("records every step and settles all three walkers with gentle steps", () => {
    for (const valley of VALLEYS) {
      const frames = rollDown(state({ valley, step: 0.15 }));
      expect(frames).toHaveLength(STEPS + 1);
      expect(frames.at(-1)!.walkers.every(({ off }) => !off)).toBe(true);
      expect(frames.at(-1)!.loss).toBeLessThan(frames[0]!.loss);
    }
  });

  it("names a winner only once the run is over", () => {
    const frames = rollDown(state({}));
    expect(firstToSettle(frames[10], "bowl")).toBeNull();
    expect(firstToSettle(frames.at(-1), "bowl")).not.toBeNull();
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

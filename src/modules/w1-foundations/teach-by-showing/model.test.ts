import { definition } from "./index";
import { missions } from "./missions";
import {
  allSorted,
  isCurrent,
  newFruit,
  robotFrame,
  robotScore,
  shownCount,
  teachingFruit,
  wrongLabels,
  type Kind,
  type TeachState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as TeachState;
const truly = (state: TeachState): Kind[] => teachingFruit(state).map(({ kind }) => kind);
const sorted = (change: Partial<TeachState> = {}, flip = false): TeachState => {
  const base = { ...initial, runs: 1, ...change };
  const right = truly(base);
  return { ...base, baskets: flip ? right.map((kind) => (1 - kind) as Kind) : right };
};

describe("teach by showing: the robot", () => {
  it("learns from tidy, rightly sorted fruit and sorts nearly all new fruit right", () => {
    const state = sorted();
    expect(allSorted(state)).toBe(true);
    expect(robotScore(state)).toBeGreaterThanOrEqual(9);
  });

  it("copies wrong labels", () => {
    const state = sorted({}, true);
    expect(wrongLabels(state)).toBe(teachingFruit(state).length);
    expect(robotScore(state)).toBeLessThanOrEqual(1);
  });

  it("shows more fruit as the dial turns up, and always both kinds", () => {
    expect(shownCount(0)).toBe(2);
    expect(shownCount(1)).toBe(12);
    const kinds = new Set(teachingFruit({ show: 0, messy: 0 }).map(({ kind }) => kind));
    expect(kinds.size).toBe(2);
  });

  it("is the same fruit and the same result every time", () => {
    expect(newFruit(initial)).toEqual(newFruit(initial));
    expect(robotFrame(sorted())).toEqual(robotFrame(sorted()));
  });

  it("only counts a try made on the baskets on screen", () => {
    const state = sorted();
    const frame = robotFrame(state);
    expect(isCurrent(state, frame)).toBe(true);
    expect(isCurrent({ ...state, messy: 0.9 }, frame)).toBe(false);
    expect(isCurrent({ ...state, runs: 0 }, frame)).toBe(false);
  });
});

describe("teach by showing: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when wrong labels teach the robot badly", () => {
    const state = sorted({}, true);
    expect(mission.when(state, robotFrame(state))).toBe(true);
  });

  it("does not fire for right labels, or before the robot tried", () => {
    const right = sorted();
    expect(mission.when(right, robotFrame(right))).toBe(false);
    const wrong = sorted({}, true);
    expect(mission.when(wrong, undefined)).toBe(false);
  });

  it("does not fire when one wrong fruit barely matters", () => {
    const state = sorted({ show: 1 });
    const baskets = [...state.baskets];
    baskets[0] = (1 - (baskets[0] ?? 0)) as Kind;
    const one = { ...state, baskets };
    expect(mission.when(one, robotFrame(one))).toBe(false);
  });

  it("answers from the robot's try on the baskets on screen", () => {
    expect(guess.answer(sorted(), robotFrame(sorted()))).toBe("yes");
    const wrong = sorted({}, true);
    expect(guess.answer(wrong, robotFrame(wrong))).toBe("no");
    expect(guess.answer(sorted(), undefined)).toBeNull();
  });
});

describe("teach by showing: links and words", () => {
  it("keeps a hand-made link sane", () => {
    const safe = definition.parseState!(
      {
        show: 7,
        messy: -2,
        runs: -4,
        baskets: [0, 1, 5, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1],
      } as never,
      initial,
    ) as TeachState;
    expect(safe.show).toBe(1);
    expect(safe.messy).toBe(0);
    expect(safe.runs).toBe(0);
    expect(safe.baskets).toHaveLength(12);
    expect(safe.baskets.every((kind) => kind === 0 || kind === 1)).toBe(true);
  });

  it("describes the sorting and the robot's try", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/^[A-Z].* fruit still to sort\.$/);
    const state = sorted();
    expect(definition.describe?.(state, robotFrame(state))).toMatch(/sorted every fruit right/);
    const wrong = sorted({}, true);
    expect(definition.describe?.(wrong, robotFrame(wrong))).toMatch(/in the wrong basket/);
  });
});

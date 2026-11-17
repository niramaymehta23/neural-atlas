import { render, screen } from "@testing-library/react";
import { count } from "@/design/copy";
import { Timeline } from "@/engine/timeline/timeline";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { APPLES, curveOf, sortOf, type SortState } from "./model";
import { predictions } from "./predictions";
import { SortScene } from "./scene";

const state = (change: Partial<SortState> = {}) =>
  ({ ...definition.initialState, ...change }) as SortState;
const [mission] = missions;
const [prediction] = predictions;

describe("is 99% actually good", () => {
  it("every apple lands in exactly one box", () => {
    for (const threshold of [0, 0.3, 0.5, 0.8, 1]) {
      const { counts } = sortOf(state({ threshold }));
      expect(counts.caught + counts.falseAlarm + counts.missed + counts.clear).toBe(APPLES);
    }
    const { counts, wormy } = sortOf(state({ rare: 10 }));
    expect(wormy).toBe(20);
    expect(counts.caught).toBeGreaterThan(counts.missed);
  });

  it("scores 99 out of 100 by never throwing an apple out, when worms are rare", () => {
    expect(mission.when(state())).toBe(false);
    const lazy = state({ rare: 1, threshold: 1 });
    expect(sortOf(lazy).right).toBeCloseTo(0.99);
    expect(mission.when(lazy)).toBe(true);
    expect(mission.when(state({ rare: 5, threshold: 1 }))).toBe(false);
  });

  it("tells the guess only for the lazy sorter with one worm in a hundred", () => {
    expect(prediction.answer(state({ rare: 1 }))).toBeNull();
    expect(prediction.answer(state({ threshold: 1 }))).toBeNull();
    expect(prediction.answer(state({ rare: 1, threshold: 1 }))).toBe("ninetyNine");
  });

  it("the sorter is far better than a coin toss across every setting", () => {
    const { area, curve } = curveOf(state());
    expect(area).toBeGreaterThan(0.8);
    expect(curve[0]).toEqual({ threshold: Infinity, falseAlarms: 0, caught: 0 });
    expect(curve.at(-1)).toMatchObject({ falseAlarms: 1, caught: 1 });
  });

  it("makes a hand-made link safe", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    expect(parse({ rare: 400, threshold: -3 } as never, definition.initialState)).toEqual({
      rare: 50,
      threshold: 0,
    });
  });

  it("draws every apple in its box, with the boxes' counts in words", () => {
    render(<SortScene state={state()} update={() => {}} timeline={new Timeline()} side="main" />);
    const { counts } = sortOf(state());
    expect(
      screen.getByText(words.box(words.boxes.caught, count(counts.caught))),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("[data-box] svg")).toHaveLength(APPLES);
    const describe = definition.describe;
    if (!describe) throw new Error("describe is required");
    expect(describe(state(), undefined)).toMatch(/Right overall/);
  });
});

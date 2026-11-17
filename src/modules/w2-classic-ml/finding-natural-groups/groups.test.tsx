import { render } from "@testing-library/react";
import { Timeline } from "@/engine/timeline/timeline";
import { definition } from "./index";
import { missions } from "./missions";
import {
  dotsOf,
  everyTime,
  framesOf,
  matchesPiles,
  MOST_MOVES,
  settleAt,
  steps,
  type GroupsFrame,
  type GroupsState,
} from "./model";
import { predictions } from "./predictions";
import { GroupsScene } from "./scene";

const state = (change: Partial<GroupsState> = {}) =>
  ({ ...definition.initialState, ...change }) as GroupsState;
const [mission] = missions;
const [prediction] = predictions;

describe("finding natural groups", () => {
  it("finds the three piles from the first drop, once it has stopped", () => {
    const done = state({ moves: MOST_MOVES });
    const last = steps(done).at(-1);
    expect(last && matchesPiles(last.groups, dotsOf(done))).toBe(true);
    expect(mission.when(done)).toBe(false);
    expect(settleAt(done)).toBeGreaterThan(0);
  });

  it("counts groups that aren't there only once the magnets stop", () => {
    expect(mission.when(state({ magnets: 2 }))).toBe(false);
    expect(mission.when(state({ magnets: 2, moves: MOST_MOVES }))).toBe(true);
    expect(mission.when(state({ piles: "rings", magnets: 2, moves: MOST_MOVES }))).toBe(true);
    expect(mission.when(state({ piles: "two", magnets: 2, moves: MOST_MOVES }))).toBe(false);
  });

  it("is the same every time from the same drop", () => {
    expect(steps(state({ attempt: 4 }))).toEqual(steps(state({ attempt: 4 })));
  });

  it("tells the guess only for three piles and three magnets", () => {
    expect(prediction.answer(state({ magnets: 2 }))).toBeNull();
    expect(prediction.answer(state())).toBe("sometimes");
    expect(everyTime(state({ spread: 1 }))).toBe("always");
  });

  it("makes a hand-made link safe", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    const saved = { piles: "lava", spread: 4, magnets: 9, attempt: -3, moves: 1e9 };
    expect(parse(saved as never, definition.initialState)).toEqual({
      piles: "three",
      spread: 1,
      magnets: 3,
      attempt: 0,
      moves: MOST_MOVES,
    });
  });

  it("puts every move on the timeline, and a new drop starts a new run", () => {
    const timeline = new Timeline<GroupsFrame>();
    const update = () => {};
    const { rerender } = render(
      <GroupsScene state={state({ moves: 1 })} update={update} timeline={timeline} side="main" />,
    );
    expect(timeline.frames().map((frame) => frame.epoch)).toEqual([0, 1]);
    const run = timeline.getState().run;
    const all = state({ moves: MOST_MOVES });
    rerender(<GroupsScene state={all} update={update} timeline={timeline} side="main" />);
    expect(timeline.frames()).toEqual(framesOf(all));
    expect(timeline.getState().run).toBe(run);
    rerender(
      <GroupsScene state={state({ attempt: 2 })} update={update} timeline={timeline} side="main" />,
    );
    expect(timeline.getState().run).toBe(run + 1);
  });

  it("describes itself in words", () => {
    const describe = definition.describe;
    if (!describe) throw new Error("describe is required");
    expect(describe(state(), undefined)).toMatch(/dropped/);
  });
});

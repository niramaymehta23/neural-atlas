import { render } from "@testing-library/react";
import { Timeline } from "@/engine/timeline/timeline";
import { definition } from "./index";
import { missions } from "./missions";
import { curves, framesOf, type RelayFrame, type RelayState } from "./model";
import { predictions } from "./predictions";
import { RelayScene } from "./scene";

const state = (change: Partial<RelayState> = {}) =>
  ({ ...definition.initialState, ...change }) as RelayState;
const [mission] = missions;
const [prediction] = predictions;

describe("the mistake relay", () => {
  it("a few runners learn the pattern; many hard-pushing runners chase odd nests", () => {
    expect(mission.when(state())).toBe(false);
    expect(mission.when(state({ runners: 10 }))).toBe(false);
    expect(mission.when(state({ runners: 60 }))).toBe(false);
    expect(mission.when(state({ runners: 60, push: 1, size: 3 }))).toBe(true);
    // Gentle, one-question runners never get there in sixty.
    expect(mission.when(state({ runners: 60, push: 0.1, size: 1 }))).toBe(false);
  });

  it("the guess waits for forty runners, then reads what new nests did", () => {
    expect(prediction.answer(state({ runners: 39 }))).toBeNull();
    expect(prediction.answer(state({ runners: 60, push: 1, size: 3 }))).toBe("falls");
    expect(prediction.answer(state({ runners: 60 }))).not.toBeNull();
    expect(prediction.answer(state({ garden: "own", points: [], runners: 60 }))).toBeNull();
  });

  it("one moment per runner, the same every time", () => {
    const frames = framesOf(state({ runners: 12 }));
    expect(frames.map((frame) => frame.epoch)).toEqual(Array.from({ length: 13 }, (_, at) => at));
    expect(curves(state({ runners: 12 })).own).toEqual(frames.map((frame) => frame.own));
  });

  it("makes a hand-made link safe", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    const saved = { garden: "own", points: [], brush: 7, runners: 9999, push: 0, size: 12 };
    expect(parse(saved as never, definition.initialState)).toEqual({
      garden: "own",
      points: [],
      brush: 2,
      runners: 60,
      push: 0.05,
      size: 3,
    });
  });

  it("says how the relay is doing", () => {
    expect(definition.describe?.(state(), undefined)).toMatch(/^No runners yet/);
    expect(definition.describe?.(state({ runners: 10 }), undefined)).toMatch(
      /^Ten runners so far\. \w+ nests are still guessed wrong\. It gets \d+ out of 100/,
    );
  });

  it("records a moment per runner, and adds to the same run when runners join", () => {
    const timeline = new Timeline<RelayFrame>();
    const update = vi.fn();
    const first = state({ runners: 5 });
    const { rerender } = render(
      <RelayScene state={first} update={update} timeline={timeline} side="main" />,
    );
    expect(timeline.frames().map((frame) => frame.epoch)).toEqual([0, 1, 2, 3, 4, 5]);
    const run = timeline.getState().run;
    rerender(
      <RelayScene
        state={{ ...first, runners: 8 }}
        update={update}
        timeline={timeline}
        side="main"
      />,
    );
    expect(timeline.frames().map((frame) => frame.epoch)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(timeline.getState().run).toBe(run);
    rerender(
      <RelayScene
        state={{ ...first, runners: 8, push: 0.5 }}
        update={update}
        timeline={timeline}
        side="main"
      />,
    );
    expect(timeline.getState().run).toBe(run + 1);
    expect(document.querySelectorAll("[data-wrong]").length).toBeGreaterThan(0);
  });
});

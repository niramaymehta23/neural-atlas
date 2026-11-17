import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "@/engine/timeline/timeline";
import type { TimelineFrame } from "@/platform/contract";
import { definition } from "./index";
import { missions } from "./missions";
import { crowdOrClever, crowdScores, SHOWN_TREES, type CrowdState } from "./model";
import { predictions } from "./predictions";
import { CrowdScene } from "./scene";

const state = (change: Partial<CrowdState> = {}) =>
  ({ ...definition.initialState, ...change }) as CrowdState;
const [mission] = missions;
const [prediction] = predictions;

describe("wisdom of the crowd", () => {
  it("every tree thinks the same only with no variety", () => {
    expect(mission.when(state())).toBe(false);
    expect(mission.when(state({ variety: 0, trees: 5 }))).toBe(true);
    expect(mission.when(state({ variety: 0, trees: 2 }))).toBe(false);
    expect(mission.when(state({ variety: 0.05, trees: 5 }))).toBe(false);
  });

  it("the guess waits for a big varied crowd, then compares it with one clever tree", () => {
    expect(prediction.answer(state())).toBeNull();
    expect(prediction.answer(state({ trees: 25, variety: 0.2 }))).toBeNull();
    const big = state({ trees: 25, variety: 0.8 });
    expect(prediction.answer(big)).toBe("crowd");
    expect(crowdOrClever(state({ garden: "own", points: [], trees: 25 }))).toBeNull();
  });

  it("a new forest is a different crowd, the same one every time", () => {
    const one = crowdScores(state({ attempt: 1 })).forest;
    expect(JSON.stringify(crowdScores(state({ attempt: 1 })).forest)).toBe(JSON.stringify(one));
    expect(JSON.stringify(crowdScores(state({ attempt: 2 })).forest)).not.toBe(JSON.stringify(one));
  });

  it("makes a hand-made link safe", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    const saved = { garden: "moons", points: [], brush: 2, trees: 1e6, variety: 9, attempt: -5 };
    expect(parse(saved as never, definition.initialState)).toEqual({
      garden: "moons",
      points: [],
      brush: 2,
      trees: 25,
      variety: 1,
      attempt: 0,
    });
  });

  it("says how the crowd does", () => {
    expect(definition.describe?.(state(), undefined)).toMatch(
      /^Nine trees vote on every spot\. Together they get \d+ out of 100/,
    );
    expect(definition.describe?.(state({ trees: 1 }), undefined)).toMatch(
      /^One tree votes on every spot\. It gets/,
    );
  });

  it("shows some of the little trees, and a new forest on request", async () => {
    const update = vi.fn();
    render(
      <CrowdScene
        state={state()}
        update={update}
        timeline={new Timeline<TimelineFrame>()}
        side="main"
      />,
    );
    expect(screen.getAllByText(/^Tree /)).toHaveLength(SHOWN_TREES);
    expect(screen.getByText("and three more")).toBeTruthy();
    const Controls = definition.controls;
    render(
      <Controls
        state={state()}
        update={update}
        timeline={new Timeline<TimelineFrame>()}
        side="main"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Grow a new forest" }));
    const change = update.mock.calls.at(-1)?.[0] as (s: CrowdState) => Partial<CrowdState>;
    expect(change(state()).attempt).toBe(1);
  });
});

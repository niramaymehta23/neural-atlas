import { render, screen } from "@testing-library/react";
import { Timeline } from "@/engine/timeline/timeline";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { bestDials, CLOUDS, shareOf, type ShadowState } from "./model";
import { predictions } from "./predictions";
import { ShadowScene } from "./scene";

const state = (change: Partial<ShadowState> = {}) =>
  ({ ...definition.initialState, ...change }) as ShadowState;
const [mission] = missions;
const [prediction] = predictions;

describe("the best shadow", () => {
  it("the best button finds a shadow at least as good as any other", () => {
    for (const cloud of CLOUDS) {
      const best = shareOf(state({ cloud, ...bestDials(cloud) }));
      for (let turn = 0; turn < 1; turn += 0.1)
        for (let tip = 0; tip <= 1; tip += 0.1)
          expect(best).toBeGreaterThanOrEqual(shareOf(state({ cloud, turn, tip })) - 1e-6);
    }
    expect(shareOf(state({ cloud: "pancake", ...bestDials("pancake") }))).toBeGreaterThan(0.95);
  });

  it("squashes only the stick to a dot, looking straight along it", () => {
    expect(mission.when(state())).toBe(false);
    // Along (1, 1, 1): an eighth of the way round, tipped up about 35 degrees.
    expect(mission.when(state({ cloud: "cigar", turn: 0.125, tip: 0.392 }))).toBe(true);
    expect(mission.when(state({ cloud: "ball", turn: 0.125, tip: 0.392 }))).toBe(false);
  });

  it("tells the guess once the torch is overhead or level, and it is overhead", () => {
    expect(prediction.answer(state({ tip: 0.5 }))).toBeNull();
    expect(prediction.answer(state({ cloud: "ball", tip: 1 }))).toBeNull();
    expect(prediction.answer(state({ tip: 1 }))).toBe("above");
    expect(prediction.answer(state({ tip: 0 }))).toBe("above");
  });

  it("makes a hand-made link safe", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    const saved = { cloud: "cube", turn: 7, tip: -1 };
    expect(parse(saved as never, definition.initialState)).toEqual({
      cloud: "pancake",
      turn: 1,
      tip: 0,
    });
  });

  it("draws the cloud and its shadow, and says how much it keeps", () => {
    render(<ShadowScene state={state()} update={() => {}} timeline={new Timeline()} side="main" />);
    expect(screen.getByRole("img", { name: words.shadow })).toBeInTheDocument();
    const describe = definition.describe;
    if (!describe) throw new Error("describe is required");
    expect(describe(state(), undefined)).toMatch(/out of 100/);
  });
});

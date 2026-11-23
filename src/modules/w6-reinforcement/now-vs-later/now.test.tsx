import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "@/engine/timeline/timeline";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  FAR,
  FAR_MOVES,
  frameOf,
  NEAR,
  NEAR_MOVES,
  PRIZE,
  RIGHT_NOW,
  START,
  workOut,
  worldOf,
  worthFromStart,
  type NowFrame,
  type NowState,
} from "./model";
import { predictions } from "./predictions";
import { NowScene } from "./scene";
import { horizon } from "./Telescope";

const state = (change: Partial<NowState> = {}) =>
  ({ ...definition.initialState, ...change }) as NowState;
const shown = (now: NowState): NowFrame => ({ ...frameOf(workOut(now)), epoch: 1 });
const PRIZES = Array.from({ length: 19 }, (_, at) => PRIZE.min + at * 0.5);
const [mission] = missions;
const [guess] = predictions;

describe("now vs later: the plan", () => {
  it("puts the bowls two and ten moves from the start", () => {
    const world = worldOf();
    expect(world.tiles[NEAR]).toBe("goal");
    expect(world.tiles[FAR]).toBe("goal");
    const near = workOut(state({ care: 0.2 }));
    expect(near.destination).toBe("near");
    expect(near.path).toHaveLength(NEAR_MOVES + 1);
    const far = workOut(state({ care: 1 }));
    expect(far.destination).toBe("far");
    expect(far.path).toHaveLength(FAR_MOVES + 1);
  });

  it("each bowl counts from the start for what the worked-out plan says", () => {
    for (const care of [0.3, 0.6, 0.9, 1]) {
      const now = state({ care });
      const { near, far } = worthFromStart(now);
      expect(workOut(now).plan.values[START]).toBeCloseTo(Math.max(near, far), 9);
    }
  });

  it("flips from the near bowl to the far one as it cares further ahead (a bowl four times as big: at about 0.85)", () => {
    expect(workOut(state({ prize: 4, care: 0.84 })).destination).toBe("near");
    expect(workOut(state({ prize: 4, care: 0.86 })).destination).toBe("far");
    // A bigger feast wins sooner; one the same size never wins.
    expect(workOut(state({ prize: 10, care: 0.77 })).destination).toBe("far");
    expect(workOut(state({ prize: 1, care: 1 })).destination).toBe("near");
  });

  it("caring only about this second goes nowhere, whatever the far bowl's size", () => {
    for (const prize of PRIZES) {
      const worked = workOut(state({ care: 0, prize }));
      expect(worked.destination).toBe("neither");
      expect(worked.path).toEqual([START]);
    }
  });

  it("at “right now” heads for the near bowl, whatever the far bowl's size (measured)", () => {
    for (const prize of PRIZES)
      for (let care = 0.01; care < RIGHT_NOW; care += 0.01)
        expect(workOut(state({ care, prize })).destination).toBe("near");
  });

  it("the telescope sees further the more it cares", () => {
    expect(horizon(0)).toBe(0);
    expect(horizon(0.3)).toBeLessThan(horizon(0.9));
    expect(horizon(1)).toBe(12);
  });
});

describe("now vs later: mission and guess", () => {
  it("fires with the telescope at its very bottom, not just near it", () => {
    const bottom = state({ care: 0 });
    expect(mission.when(bottom, shown(bottom))).toBe(true);
    const nearly = state({ care: 0.01 });
    expect(mission.when(nearly, shown(nearly))).toBe(false);
    expect(mission.when(bottom, shown(nearly))).toBe(false);
  });

  it("answers in the “right now” band: the near bowl", () => {
    expect(guess.answer(state(), shown(state()))).toBeNull();
    const now = state({ care: 0.2, prize: PRIZE.max });
    expect(guess.answer(now, shown(now))).toBe("near");
    const bottom = state({ care: 0 });
    expect(guess.answer(bottom, shown(bottom))).toBeNull();
    expect(guess.answer(now, shown(state()))).toBeNull();
  });
});

describe("now vs later: links and words", () => {
  it("clamps a hand-made link onto the dials", () => {
    const safe = definition.parseState!(
      { care: 9, prize: -4 } as unknown as NowState,
      definition.initialState,
    ) as NowState;
    expect(safe).toEqual({ care: 1, prize: PRIZE.min });
  });

  it("says where it heads", () => {
    const describe = definition.describe!;
    expect(describe(state({ care: 0 }), undefined)).toBe(words.heads.neither);
    expect(describe(state({ care: 0.95 }), shown(state({ care: 0.95 })))).toBe(words.heads.far);
    expect(describe(state({ care: 0.2 }), undefined)).toBe(words.heads.near);
  });

  it("draws the route as paw prints and the far bowl's food heaped by its size", () => {
    const { container } = render(
      <NowScene
        state={state({ care: 1, prize: 7 })}
        update={vi.fn()}
        timeline={new Timeline()}
        side="main"
      />,
    );
    expect(container.querySelectorAll("[data-footprint]")).toHaveLength(FAR_MOVES);
    expect(container.querySelector("[data-food='7']")).not.toBeNull();
    expect(screen.getByTestId("now-vs-later").dataset.heads).toBe("far");
    expect(container.querySelector("[data-bowl=far]")?.getAttribute("data-heads")).toBe("true");
  });
});

describe("now vs later: in the lesson", () => {
  it("earns the star for caring only about this second", async () => {
    render(<ModuleShell lesson={{ ...valleyLesson, id: "now-vs-later-1" }} module={definition} />);
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    act(() => within(dock).getByRole("slider", { name: words.care.label }).focus());
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });
});

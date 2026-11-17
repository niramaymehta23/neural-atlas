import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "@/engine/timeline/timeline";
import { companionStore } from "@/platform/companion/companion";
import { CellsControls } from "./controls";
import { definition } from "./index";
import { missions } from "./missions";
import type { CellsFrame, CellsState } from "./model";
import { predictions } from "./predictions";

const state = (change: Partial<CellsState> = {}) =>
  ({ ...definition.initialState, ...change }) as CellsState;
const frame = (epoch: number, loss: number) => ({ epoch, loss, params: new Float64Array() });

describe("stacking cells", () => {
  it("turning the layer dial reshapes the learner's own network", async () => {
    const update = vi.fn();
    render(
      <CellsControls
        state={state({ layers: 1, cells: 4 })}
        update={update}
        timeline={new Timeline<CellsFrame>()}
        side="main"
      />,
    );
    screen.getByRole("slider", { name: "How many layers" }).focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(update).toHaveBeenCalledWith({ layers: 2, cells: 4, epochs: 0 });
    await vi.waitFor(() => expect(companionStore.getState().hidden).toEqual([4, 4]));
  });

  it("the spiral mission needs one cell that stays wrong after long practice", () => {
    const [mission] = missions;
    const oneCell = state({ garden: "spiral", layers: 1, cells: 1 });
    expect(mission.when(oneCell, frame(200, 0.67))).toBe(true);
    expect(mission.when(oneCell, frame(40, 0.67))).toBe(false);
    expect(mission.when({ ...oneCell, cells: 4 }, frame(200, 0.67))).toBe(false);
    expect(mission.when({ ...oneCell, garden: "ring" }, frame(200, 0.67))).toBe(false);
    expect(mission.when(oneCell, frame(200, 0.05))).toBe(false);
  });

  it("answers the ring guess only for one cell on the ring after enough practice", () => {
    const [prediction] = predictions;
    const ring = state({ garden: "ring", layers: 1, cells: 1 });
    expect(prediction.answer(ring, frame(50, 0.6))).toBeNull();
    expect(prediction.answer(ring, frame(150, 0.55))).toBe("no");
    expect(prediction.answer(state({ garden: "ring" }), frame(150, 0.1))).toBeNull();
  });

  it("clamps a hand-made link's dials and garden to what the scene can draw (PLT-02)", () => {
    const initial = definition.initialState as CellsState;
    const parsed = definition.parseState?.(
      {
        ...initial,
        layers: 100000,
        cells: -3,
        step: 9,
        points: Array(5000).fill(initial.points[0]),
      },
      initial,
    ) as CellsState;
    expect(parsed).toMatchObject({ layers: 4, cells: 1, step: 1 });
    expect(parsed.points.length).toBeLessThanOrEqual(600);
  });

  it("starts from the learner's own network (PLT-22)", () => {
    const initial = definition.initialState as CellsState;
    const opened = definition.initialFrom?.(
      { hidden: [4, 4], activation: "tanh", convolution: false },
      initial,
    ) as CellsState;
    expect(opened).toMatchObject({ layers: 2, cells: 4 });
  });
});

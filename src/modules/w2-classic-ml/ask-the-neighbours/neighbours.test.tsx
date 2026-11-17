import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "@/engine/timeline/timeline";
import type { TimelineFrame } from "@/platform/contract";
import { definition } from "./index";
import { missions } from "./missions";
import { ASK, edgeChange, plantTown, type NeighboursState } from "./model";
import { predictions } from "./predictions";
import { NeighboursScene } from "./scene";

const state = (change: Partial<NeighboursState> = {}) =>
  ({ ...definition.initialState, ...change }) as NeighboursState;
const [mission] = missions;
const [prediction] = predictions;
/** The odd Owls fan living among the Foxes in the town. */
const ODD = { x: 0.42, y: 0.3 };

describe("ask the neighbours", () => {
  it("one odd neighbour decides when only one is asked, and not when the street is asked", () => {
    const beside = { x: ODD.x + 0.01, y: ODD.y };
    expect(mission.when(state({ family: beside, neighbours: 1 }))).toBe(true);
    expect(mission.when(state({ family: beside, neighbours: 9 }))).toBe(false);
    // Asking one, but in the middle of the Foxes' street: the odd fan is not the nearest.
    expect(mission.when(state({ family: { x: 0.3, y: 0.45 }, neighbours: 1 }))).toBe(false);
    expect(mission.when(state())).toBe(false);
  });

  it("the guess waits for many neighbours, then reads the real edge", () => {
    expect(prediction.answer(state())).toBeNull();
    const many = state({ neighbours: 11 });
    expect(prediction.answer(many)).toBe(edgeChange(many));
    expect(prediction.answer(many)).toBe("smoother");
    expect(prediction.answer(state({ garden: "own", points: [], neighbours: 11 }))).toBeNull();
  });

  it("makes a hand-made link safe", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    const saved = {
      ...definition.initialState,
      garden: "mars",
      points: [
        { x: 5, y: 0, label: 0 },
        { x: 0.1, y: 0.2, label: 1 },
      ],
      brush: 99,
      neighbours: 400,
      closeness: -3,
      family: { x: 7, y: -9 },
    };
    expect(parse(saved as never, definition.initialState)).toEqual({
      garden: "town",
      points: [{ x: 0.1, y: 0.2, label: 1 }],
      brush: ASK,
      neighbours: 15,
      closeness: 0,
      family: { x: 1, y: -1 },
    });
  });

  it("says what the map shows", () => {
    const describe = definition.describe;
    expect(describe?.(state(), undefined)).toMatch(/nearest three neighbours/);
    expect(describe?.(state({ family: { x: 0.35, y: 0.35 } }), undefined)).toMatch(/the Foxes/);
    expect(describe?.(state({ points: [] }), undefined)).toBe("The town is empty.");
  });

  it("the compare split asks one neighbour", () => {
    expect(definition.compare?.(state()).neighbours).toBe(1);
    expect(definition.compare?.(state({ neighbours: 1 })).neighbours).toBe(9);
  });

  it("a tap on the map drops the new family in, and the threads reach the neighbours", async () => {
    const update = vi.fn();
    const { rerender } = render(
      <NeighboursScene
        state={state()}
        update={update}
        timeline={new Timeline<TimelineFrame>()}
        side="main"
      />,
    );
    screen.getByRole("application").focus();
    await userEvent.keyboard("{Enter}");
    expect(update).toHaveBeenCalledWith({ family: { x: 0, y: 0 } });
    rerender(
      <NeighboursScene
        state={state({ family: { x: 0.35, y: 0.35 } })}
        update={update}
        timeline={new Timeline<TimelineFrame>()}
        side="main"
      />,
    );
    expect(document.querySelectorAll("[data-neighbour]")).toHaveLength(3);
    expect(screen.getByText(/probably cheers for the Foxes/)).toBeTruthy();
  });

  it("plants the town the same way every time", () => {
    expect(plantTown("town")).toEqual(plantTown("town"));
    expect(plantTown("own")).toEqual([]);
  });
});

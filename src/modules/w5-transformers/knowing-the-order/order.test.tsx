import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { frameOf, fullOrder, moved, type OrderFrame, type OrderState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as OrderState;
const at = (change: Partial<OrderState>): OrderState => ({ ...initial, ...change });
const shown = (state: OrderState): OrderFrame => ({ ...frameOf(state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("knowing the order: the reader", () => {
  it("tells dog bites man from man bites dog with stamps", () => {
    expect(shown(initial).difference).toBeGreaterThan(0.05);
  });

  it("cannot tell them apart without stamps, or with flat waves", () => {
    expect(shown(at({ strength: 0 })).difference).toBe(0);
    expect(shown(at({ speed: 0 })).difference).toBe(0);
  });

  it("does not count swapping two of the same word as a shuffle", () => {
    expect(shown(at({ sentence: "the cat and the dog", order: [3, 1, 2, 0, 4] })).shuffled).toBe(
      false,
    );
  });

  it("only accepts a full reordering, and moves words one place", () => {
    expect(fullOrder([0, 0, 1], 3)).toEqual([0, 1, 2]);
    expect(moved([0, 1, 2], 0, 1)).toEqual([1, 0, 2]);
    expect(moved([0, 1, 2], 2, 1)).toEqual([0, 1, 2]);
  });
});

describe("knowing the order: mission and guess", () => {
  it("fires for a shuffle the reader cannot see", () => {
    const state = at({ strength: 0 });
    expect(mission.when(state, shown(state))).toBe(true);
    expect(mission.when(initial, shown(initial))).toBe(false);
    expect(
      mission.when(at({ order: [], strength: 0 }), shown(at({ order: [], strength: 0 }))),
    ).toBe(false);
    expect(mission.when(initial, shown(state))).toBe(false);
  });

  it("answers no once the stamps are off for the example", () => {
    expect(guess.answer(initial, shown(initial))).toBeNull();
    expect(guess.answer(initial, shown(at({ strength: 0 })))).toBe("no");
  });
});

describe("knowing the order: links and words", () => {
  it("keeps a hand-made link to a real reordering and the dials' range", () => {
    const safe = definition.parseState!(
      {
        sentence: "dog bites man",
        order: [5, 1, 0],
        strength: 4,
        speed: -1,
      } as unknown as OrderState,
      initial,
    ) as OrderState;
    expect(safe).toEqual({ sentence: "dog bites man", order: [0, 1, 2], strength: 1, speed: 0 });
  });

  it("describes the order it reads", () => {
    expect(definition.describe?.(initial, shown(initial))).toMatch(/“man bites dog”/);
  });
});

describe("knowing the order: in the lesson", () => {
  it("earns the star by turning the stamps down", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "knowing-the-order-1" }} module={definition} />,
    );
    expect(screen.getByRole("button", { name: words.earlier("bites") })).toBeInTheDocument();
    const dial = screen.getByRole("slider", { name: words.strength.label });
    dial.focus();
    await userEvent.keyboard("{Home}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });
});

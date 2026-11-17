import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { appleChance, dialOf, LAYERS, PARAMS, thought, type ForwardState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as ForwardState;
const fruit = (round: number, red: number, change: Partial<ForwardState> = {}): ForwardState => ({
  round: dialOf(round),
  red: dialOf(red),
  shown: LAYERS,
  thoughts: 1,
  ...change,
});

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `thinking-forwards-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("thinking forwards: the network", () => {
  it("has learned apples from bananas", () => {
    expect(appleChance(fruit(0.6, 0.6))).toBeGreaterThan(0.9);
    expect(appleChance(fruit(-0.6, -0.6))).toBeLessThan(0.1);
  });

  it("is the same network every time it loads", () => {
    expect(PARAMS.every(Number.isFinite)).toBe(true);
    expect(thought(fruit(0.2, -0.3))).toEqual(thought(fruit(0.2, -0.3)));
    expect(thought(fruit(0, 0)).map((layer) => layer.length)).toEqual([2, 3, 2, 1]);
  });
});

describe("thinking forwards: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires for a finished thought about nonsense that comes out very sure", () => {
    expect(mission.when(fruit(3, -3))).toBe(true);
    expect(mission.when(fruit(-3, 0))).toBe(true);
  });

  it("does not fire for real fruit, or before the thought is through", () => {
    expect(mission.when(fruit(0.6, 0.6))).toBe(false);
    expect(mission.when(fruit(3, -3, { shown: 1 }))).toBe(false);
    expect(mission.when(fruit(3, -3, { thoughts: 0, shown: 0 }))).toBe(false);
  });

  it("answers the guess from the first finished thought about nonsense", () => {
    expect(guess.answer(fruit(3, -3))).toBe("very");
    expect(guess.answer(fruit(0.6, 0.6))).toBeNull();
    expect(guess.answer(initial)).toBeNull();
  });
});

describe("thinking forwards: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { round: 9, red: -2, shown: 40, thoughts: -1 } as ForwardState,
      initial,
    ) as ForwardState;
    expect(safe).toEqual({ round: 1, red: 0, shown: LAYERS, thoughts: 0 });
  });

  it("describes the fruit, the travelling thought and the answer", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/nice and round and red/);
    expect(definition.describe?.(fruit(0.6, 0.6, { shown: 1 }), undefined)).toMatch(/First layer/);
    expect(definition.describe?.(fruit(0.6, 0.6), undefined)).toMatch(/an apple, very sure/);
  });
});

describe("thinking forwards: in the lesson", () => {
  it("sends the thought through one layer at a time", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderLesson();
      const scene = screen.getByTestId("thinking-forwards");
      await userEvent.click(screen.getByRole("button", { name: words.think }));
      expect(scene).toHaveAttribute("data-shown", "1");
      act(() => vi.advanceTimersByTime(800));
      expect(scene).toHaveAttribute("data-shown", "2");
      act(() => vi.advanceTimersByTime(800));
      expect(scene).toHaveAttribute("data-shown", String(LAYERS));
      expect(document.querySelector("[data-answer]")).toHaveTextContent(/an apple/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("earns the star for a sure answer about nonsense", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.round.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.think }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
  });
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { bigNumber, words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { bestFor, frameOf, surprise, type ScaleFrame, type ScaleState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as ScaleState;
const at = (change: Partial<Record<keyof ScaleState, number>>): ScaleState => ({
  ...initial,
  ...change,
});
const shown = (state: ScaleState): ScaleFrame => ({ ...frameOf(state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("bigger and bigger: the law", () => {
  it("matches the Chinchilla fit", () => {
    expect(surprise(Math.log10(70e9), Math.log10(1.4e12))).toBeCloseTo(1.94, 2);
  });

  it("grows the best brain with the budget", () => {
    expect(bestFor(22).brain).toBeGreaterThan(bestFor(20).brain);
  });

  it("cuts reading short when the budget runs out", () => {
    const frame = shown(at({ brain: 12, reading: 14 }));
    expect(frame.spent).toBe(true);
    expect(frame.read).toBeLessThan(8);
  });

  it("says big numbers in words", () => {
    expect(bigNumber(9.3)).toBe("about 2 billion");
    expect(bigNumber(12)).toBe("about 1 trillion");
  });
});

describe("bigger and bigger: mission and guess", () => {
  it("fires for a lopsided plan that spends the budget", () => {
    for (const state of [at({ brain: 12, reading: 14 }), at({ brain: 6, reading: 14 })])
      expect(mission.when(state, shown(state))).toBe(true);
  });

  it("does not fire for the starting plan or the best plan", () => {
    expect(mission.when(initial, shown(initial))).toBe(false);
    const best = definition.compare!(initial) as ScaleState;
    expect(mission.when(best, shown(best))).toBe(false);
  });

  it("answers both once the computing is turned up", () => {
    expect(guess.answer(initial, shown(initial))).toBeNull();
    expect(guess.answer(initial, shown(at({ budget: 21 })))).toBe("both");
  });
});

describe("bigger and bigger: links", () => {
  it("keeps a hand-made link inside the dials", () => {
    expect(definition.parseState!({ brain: 99, reading: -5, budget: 20 }, initial)).toEqual({
      brain: 12,
      reading: 8,
      budget: 20,
    });
  });
});

describe("bigger and bigger: in the lesson", () => {
  it("earns the star by pouring everything into the brain", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "bigger-and-bigger-1" }} module={definition} />,
    );
    for (const label of [words.brain.label, words.reading.label]) {
      screen.getByRole("slider", { name: label }).focus();
      await userEvent.keyboard("{End}");
    }
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadWriters } from "@/engine/language/files";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import type { Storyteller } from "@/engine/language/writers";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { ALL, barsOf, frameOf, startScores, type SamplingFrame, type SamplingState } from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
let teller: Storyteller;
beforeAll(async () => {
  teller = (await loadWriters()).storyteller;
}, 10_000);

const initial = definition.initialState as SamplingState;
const at = (change: Partial<SamplingState>): SamplingState => ({ ...initial, ...change });
const shown = (state: SamplingState): SamplingFrame => ({ ...frameOf(teller, state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("safe vs adventurous: the dials", () => {
  it("makes the likeliest word certain when boring, and evens the chances when wild", () => {
    const scores = startScores(teller, initial.start)!;
    expect(barsOf(teller, scores, { heat: 0, choices: ALL })[0]?.chance).toBe(1);
    const ordinary = barsOf(teller, scores, { heat: 1, choices: ALL })[0]?.chance ?? 0;
    expect(barsOf(teller, scores, { heat: 3, choices: ALL })[0]?.chance).toBeLessThan(ordinary);
  });

  it("leaves out every word past the ones it may choose from", () => {
    const scores = startScores(teller, initial.start)!;
    const bars = barsOf(teller, scores, { heat: 1, choices: 2 });
    expect(bars.filter(({ chance }) => chance > 0)).toHaveLength(2);
  });
});

describe("safe vs adventurous: mission and guess", () => {
  it("writes gibberish when wild with any word", () => {
    const state = at({ heat: 3 });
    expect(mission.when(state, shown(state))).toBe(true);
  });

  it("stays sensible when wild but choosing from few words, and ordinary chances", () => {
    expect(mission.when(initial, shown(initial))).toBe(false);
    const few = at({ heat: 3, choices: 3, seed: 3 });
    expect(mission.when(few, shown(few))).toBe(false);
  });

  it("answers the same story every time once boring", () => {
    expect(guess.answer(initial, shown(initial))).toBeNull();
    expect(guess.answer(initial, shown(at({ heat: 0 })))).toBe("same");
  });
});

describe("safe vs adventurous: links and words", () => {
  it("keeps a hand-made link inside the dials", () => {
    const safe = definition.parseState!(
      { start: "the cat", heat: 40, choices: 0, seed: 1e9 },
      initial,
    );
    expect(safe).toEqual({ start: "the cat", heat: 3, choices: 1, seed: 999 });
  });
});

describe("safe vs adventurous: in the lesson", () => {
  it("redraws the bars the moment the dial turns, and earns the star when wild", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "safe-vs-adventurous-1" }} module={definition} />,
    );
    await waitFor(() => expect(document.querySelector("[data-chances]")).not.toBeNull(), {
      timeout: 10_000,
    });
    const top = () => document.querySelector("[data-chances] li")?.getAttribute("data-chance");
    const before = top();
    const dial = screen.getByRole("slider", { name: words.heat.label });
    dial.focus();
    await userEvent.keyboard("{End}");
    expect(top()).not.toBe(before);
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 20_000);
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadWriters } from "@/engine/language/files";
import { goesInCircles } from "@/engine/language/story";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import type { Storyteller } from "@/engine/language/writers";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { frameOf, type NextFrame, type NextState } from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
let teller: Storyteller;
beforeAll(async () => {
  teller = (await loadWriters()).storyteller;
}, 10_000);

const initial = definition.initialState as NextState;
const at = (change: Partial<NextState>): NextState => ({ ...initial, ...change });
const shown = (state: NextState): NextFrame => ({ ...frameOf(teller, state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("guess the next word: the storyteller", () => {
  it("thinks mat is likeliest after the cat sat on the", () => {
    expect(shown(initial).next[0]?.word).toBe("mat");
  });

  it("writes the same story for the same seed, and another for another", () => {
    const one = shown(at({ added: 12 })).written;
    expect(shown(at({ added: 12 })).written).toEqual(one);
    expect(shown(at({ added: 12, seed: 2 })).written).not.toEqual(one);
  });

  it("spots a phrase coming twice in a row", () => {
    expect(goesInCircles("the dog sat on the mat . the dog sat on the mat .".split(" "))).toBe(
      true,
    );
    expect(goesInCircles("the dog the dog".split(" "))).toBe(false);
  });

  it("says when the start has a word it never read", () => {
    expect(shown(at({ start: "the spaceship" })).known).toBe(false);
  });
});

describe("guess the next word: mission and guess", () => {
  it("goes round in circles when always picking the likeliest", () => {
    const state = at({ likeliest: true, added: 20 });
    const frame = shown(state);
    expect(frame.circles).toBe(true);
    expect(mission.when(state, frame)).toBe(true);
    expect(guess.answer(state, frame)).toBe("circles");
  });

  it("does not answer before twenty likeliest words, or fire on an old frame", () => {
    expect(guess.answer(initial, shown(at({ likeliest: true, added: 10 })))).toBeNull();
    expect(guess.answer(initial, shown(at({ added: 30 })))).toBeNull();
    expect(mission.when(initial, shown(at({ likeliest: true, added: 20 })))).toBe(false);
  });
});

describe("guess the next word: links and words", () => {
  it("keeps a hand-made link inside its limits", () => {
    const safe = definition.parseState!(
      { start: "x".repeat(300), added: 500, likeliest: true, seed: -4 },
      initial,
    );
    expect(safe).toEqual({ start: "x".repeat(120), added: 60, likeliest: true, seed: 1 });
  });

  it("describes the story and the likeliest next word", () => {
    expect(definition.describe?.(initial, shown(initial))).toMatch(/likeliest next word is “mat”/);
  });
});

describe("guess the next word: in the lesson", () => {
  it("earns the star by trapping it in a loop", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "guess-the-next-word-1" }} module={definition} />,
    );
    await waitFor(() => expect(document.querySelector("[data-chances]")).not.toBeNull(), {
      timeout: 10_000,
    });
    await userEvent.click(screen.getByRole("switch", { name: words.likeliest }));
    await userEvent.click(screen.getByRole("button", { name: words.spinTen }));
    await userEvent.click(screen.getByRole("button", { name: words.spinTen }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 20_000);

  it("writes more words from the words dial", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "guess-the-next-word-2" }} module={definition} />,
    );
    await waitFor(() => expect(document.querySelector("[data-chances]")).not.toBeNull(), {
      timeout: 10_000,
    });
    const dial = screen.getAllByRole("slider", { name: words.length.label })[0] as HTMLElement;
    dial.focus();
    await userEvent.keyboard("{ArrowRight>5/}");
    await waitFor(() => expect(screen.getAllByText(words.written(5)).length).toBeGreaterThan(0));
  }, 20_000);
});

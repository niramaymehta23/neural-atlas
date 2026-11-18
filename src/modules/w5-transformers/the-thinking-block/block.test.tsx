import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { blurred, frameOf, MOST_BLOCKS, type BlockFrame, type BlockState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as BlockState;
const at = (change: Partial<BlockState>): BlockState => ({ ...initial, ...change });
const shown = (state: BlockState): BlockFrame => ({ ...frameOf(state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("the thinking block: the river", () => {
  it("keeps words apart with the shortcut, at every strength and depth", () => {
    for (const strength of [0.1, 0.5, 1])
      expect(blurred(shown(at({ blocks: MOST_BLOCKS, strength })))).toBe(false);
  });

  it("blurs words together within a few blocks without it", () => {
    expect(blurred(shown(at({ blocks: 3, shortcut: false })))).toBe(true);
    expect(blurred(shown(at({ blocks: 1, shortcut: false })))).toBe(false);
  });
});

describe("the thinking block: mission and guess", () => {
  it("fires only for a blur without the shortcut, on the frame on screen", () => {
    const state = at({ shortcut: false });
    expect(mission.when(state, shown(state))).toBe(true);
    expect(mission.when(initial, shown(initial))).toBe(false);
    expect(mission.when(initial, shown(state))).toBe(false);
  });

  it("answers blur once six blocks run without the shortcut", () => {
    expect(guess.answer(initial, shown(initial))).toBeNull();
    expect(guess.answer(initial, shown(at({ shortcut: false })))).toBeNull();
    expect(guess.answer(initial, shown(at({ shortcut: false, blocks: 6 })))).toBe("blur");
  });
});

describe("the thinking block: links and words", () => {
  it("keeps a hand-made link inside the dials", () => {
    const safe = definition.parseState!({ blocks: 99, strength: -2, shortcut: false }, initial);
    expect(safe).toEqual({ blocks: MOST_BLOCKS, strength: 0.1, shortcut: false });
  });

  it("describes the blocks and how alike the words are", () => {
    expect(definition.describe?.(initial, shown(initial))).toMatch(
      /^Three blocks, with the shortcut/,
    );
  });
});

describe("the thinking block: in the lesson", () => {
  it("earns the star by switching the shortcut off", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "the-thinking-block-1" }} module={definition} />,
    );
    await userEvent.click(screen.getByRole("switch", { name: words.shortcut }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
    expect(document.querySelector("[data-blurred]")).not.toBeNull();
  });
});

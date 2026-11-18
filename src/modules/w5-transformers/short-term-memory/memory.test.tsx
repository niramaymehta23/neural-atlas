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
import { frameOf, NAMES, PETS, type MemoryFrame, type MemoryState } from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
let teller: Storyteller;
beforeAll(async () => {
  teller = (await loadWriters()).storyteller;
}, 10_000);

const initial = definition.initialState as MemoryState;
const at = (change: Partial<MemoryState>): MemoryState =>
  ({ ...initial, ...change }) as MemoryState;
const shown = (state: MemoryState): MemoryFrame => ({ ...frameOf(teller, state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("short-term memory: the tunnel", () => {
  it("remembers every name while it is in view", () => {
    for (const pet of PETS)
      for (const name of NAMES) {
        const frame = shown(at({ pet, name }));
        expect(frame.inView).toBe(true);
        expect(frame.answers[0]?.word).toBe(name);
      }
  });

  it("loses the name once it slides out", () => {
    const frame = shown(at({ window: 24 }));
    expect(frame.inView).toBe(false);
    expect(frame.answers[0]?.word).not.toBe("maple");
  });
});

describe("short-term memory: mission and guess", () => {
  it("fires once the name is out of view and the answer is wrong", () => {
    const state = at({ chatter: 8 });
    expect(mission.when(state, shown(state))).toBe(true);
    expect(mission.when(initial, shown(initial))).toBe(false);
    expect(guess.answer(state, shown(state))).toBe("wrong");
    expect(guess.answer(initial, shown(initial))).toBeNull();
  });
});

describe("short-term memory: links", () => {
  it("keeps a hand-made link to real pets, names and dials", () => {
    expect(
      definition.parseState!({ pet: "dragon", name: "x", window: 2, chatter: 99 }, initial),
    ).toEqual({
      pet: "dog",
      name: "maple",
      window: 8,
      chatter: 8,
    });
  });
});

describe("short-term memory: in the lesson", () => {
  it("earns the star by shrinking the tunnel", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "short-term-memory-1" }} module={definition} />,
    );
    await waitFor(() => expect(document.querySelector("[data-answer]")).not.toBeNull(), {
      timeout: 10_000,
    });
    screen.getByRole("slider", { name: words.window.label }).focus();
    await userEvent.keyboard("{Home}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 20_000);
});

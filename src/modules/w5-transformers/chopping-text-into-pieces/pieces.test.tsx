import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadPieceSet } from "@/engine/language/files";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import type { PieceSet } from "@/engine/language/bpe";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { SAMPLES, words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { dearerGreeting, frameOf, LONGEST, mergesOf, type PiecesState } from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
let set: PieceSet;
beforeAll(async () => {
  set = await loadPieceSet();
}, 10_000);

const initial = definition.initialState as PiecesState;
const at = (change: Partial<PiecesState>): PiecesState => ({ ...initial, ...change });
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `chopping-text-into-pieces-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("chopping text into pieces: the chopper", () => {
  it("spans single bits to every glue step on the dial", () => {
    expect(mergesOf(0)).toBe(0);
    expect(mergesOf(1)).toBe(50_000);
    expect(mergesOf(0.5)).toBeGreaterThan(100);
  });

  it("finds the Gujarati greeting dearer than the English one", () => {
    expect(dearerGreeting(set)).toBe("gujarati");
  });
});

describe("chopping text into pieces: mission and guess", () => {
  it("fires for real pieces of writing that cost more than its letters", () => {
    const state = at({ text: SAMPLES.gujarati });
    expect(mission.when(state, frameOf(set, state, 1))).toBe(true);
    const emoji = at({ text: SAMPLES.emoji });
    expect(mission.when(emoji, frameOf(set, emoji, 1))).toBe(true);
  });

  it("does not fire for English, a shrunken chopper, a stale frame or a lone emoji", () => {
    expect(mission.when(initial, frameOf(set, initial, 1))).toBe(false);
    const shrunk = at({ text: SAMPLES.gujarati, known: 0 });
    expect(mission.when(shrunk, frameOf(set, shrunk, 1))).toBe(false);
    const short = at({ text: SAMPLES.gujarati, longest: LONGEST - 1 });
    expect(mission.when(short, frameOf(set, short, 1))).toBe(false);
    expect(mission.when(at({ text: SAMPLES.gujarati }), frameOf(set, initial, 1))).toBe(false);
    const lone = at({ text: "🐶" });
    expect(mission.when(lone, frameOf(set, lone, 1))).toBe(false);
  });

  it("answers only once Gujarati is on screen, whatever the dials say", () => {
    expect(guess.answer(initial, frameOf(set, initial, 1))).toBeNull();
    for (const known of [0, 0.5, 1]) {
      const state = at({ text: SAMPLES.gujarati, known, longest: 2 });
      expect(guess.answer(state, frameOf(set, state, 1))).toBe("gujarati");
    }
  });
});

describe("chopping text into pieces: links and words", () => {
  it("keeps a hand-made link inside its dials and text box", () => {
    const safe = definition.parseState!(
      { text: "x".repeat(900), known: 7, longest: -3 } as unknown as PiecesState,
      initial,
    ) as PiecesState;
    expect(safe).toEqual({ text: "x".repeat(200), known: 1, longest: 1 });
  });

  it("describes the cost", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(initial, frameOf(set, initial, 1))).toMatch(/pieces for/);
    const empty = at({ text: "" });
    expect(definition.describe?.(empty, frameOf(set, empty, 1))).toBe(words.describe.empty);
  });

  it("compares with single bits, or every piece when only bits are known", () => {
    expect(definition.compare?.(initial)).toMatchObject({ known: 0 });
    expect(definition.compare?.(at({ known: 0 }))).toMatchObject({ known: 1 });
  });
});

describe("chopping text into pieces: in the lesson", () => {
  it("chops the sample and earns the star for Gujarati", async () => {
    renderLesson();
    await waitFor(() => expect(document.querySelector("[data-pieces]")).not.toBeNull(), {
      timeout: 10_000,
    });
    expect(document.querySelector("[data-cost]")?.textContent).toMatch(/pieces for/);
    await userEvent.click(screen.getByRole("button", { name: words.samples.gujarati }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(document.querySelector("[data-more]")).not.toBeNull();
  }, 20_000);
});

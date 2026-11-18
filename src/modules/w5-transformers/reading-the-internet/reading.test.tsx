import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWriterRun } from "@/engine/language/baby-gpt";
import { loadWriters } from "@/engine/language/files";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import { practiseInProcess } from "@/engine/language/testing/in-process-writer";
import type { LetterWriter } from "@/engine/language/writers";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { TEXTS, words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  configOf,
  frameOf,
  isOneSentence,
  runOf,
  type ReadingFrame,
  type ReadingState,
} from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
practiseInProcess();
let writer: LetterWriter;
beforeAll(async () => {
  writer = (await loadWriters()).writer;
}, 10_000);

const initial = definition.initialState as ReadingState;
const at = (change: { text?: string; learning?: number }): ReadingState => ({
  ...initial,
  ...change,
});
const [mission] = missions;
const [guess] = predictions;

/** The moment after `steps` practice steps, as the lesson records it. */
function practised(state: ReadingState, steps: number): ReadingFrame {
  const config = configOf(writer, state);
  if (!config) throw new Error("No run");
  const run = createWriterRun(config);
  while (run.step < steps) run.advance();
  return frameOf(writer, run.moment(), runOf(state));
}

describe("reading the internet: one sentence", () => {
  it("knows one sentence from several", () => {
    expect(isOneSentence(TEXTS.sentence)).toBe(true);
    expect(isOneSentence(TEXTS.rhymes)).toBe(false);
    expect(isOneSentence("Hi.")).toBe(false);
  });

  it("learns one sentence by heart within a hundred steps, earning the star and the guess", () => {
    const state = at({ text: TEXTS.sentence });
    const frame = practised(state, 100);
    expect(frame.sample).toContain("found a grain of");
    expect(mission.when(state, frame)).toBe(true);
    expect(guess.answer(state, frame)).toBe("copy");
    expect(mission.when(at({ text: TEXTS.sentence, learning: 0.005 }), frame)).toBe(false);
  }, 30_000);

  it("has not learned it before practising", () => {
    const state = at({ text: TEXTS.sentence });
    const frame = practised(state, 0);
    expect(mission.when(state, frame)).toBe(false);
    expect(guess.answer(state, frame)).toBeNull();
  });
});

describe("reading the internet: links and words", () => {
  it("keeps a hand-made link inside the dials and never opens practising", () => {
    const safe = definition.parseState!(
      { text: "x".repeat(900), learning: 1, steps: 9999, running: true },
      initial,
    );
    expect(safe).toEqual({ text: "x".repeat(600), learning: 0.01, steps: 400, running: false });
  });
});

describe("reading the internet: in the lesson", () => {
  it("practises in the background and shows what it writes", async () => {
    render(
      <ModuleShell
        lesson={{ ...valleyLesson, id: "reading-the-internet-1" }}
        module={definition}
      />,
    );
    await waitFor(() => expect(document.querySelector("[data-sample]")?.textContent).not.toBe(""), {
      timeout: 10_000,
    });
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    await waitFor(
      () =>
        expect(
          Number(document.querySelector("[data-step]")?.getAttribute("data-step")),
        ).toBeGreaterThan(0),
      {
        timeout: 20_000,
      },
    );
    await userEvent.click(screen.getByRole("button", { name: words.pause }));
  }, 40_000);
});

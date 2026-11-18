import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWriterRun } from "@/engine/language/baby-gpt";
import { loadWriters } from "@/engine/language/files";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import { practiseInProcess } from "@/engine/language/testing/in-process-writer";
import type { LetterWriter } from "@/engine/language/writers";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  configOf,
  frameOf,
  runOf,
  talksLikeAPirate,
  type TuneFrame,
  type TuneState,
} from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
practiseInProcess();
let writer: LetterWriter;
beforeAll(async () => {
  writer = (await loadWriters()).writer;
}, 10_000);

const initial = definition.initialState as TuneState;
const at = (change: { mix?: number; learning?: number }): TuneState => ({ ...initial, ...change });
const [mission] = missions;
const [guess] = predictions;

function practised(state: TuneState, steps: number): TuneFrame {
  const config = configOf(writer, state);
  if (!config) throw new Error("No run");
  const run = createWriterRun(config);
  while (run.step < steps) run.advance();
  return frameOf(writer, run.moment(), runOf(state));
}

describe("specialising: pirate talk", () => {
  it("writes everyday sentences before practising, and keeps them", () => {
    const frame = practised(initial, 0);
    expect(talksLikeAPirate(frame.sample)).toBe(false);
    expect(mission.when(initial, frame)).toBe(false);
  });

  it("talks like a pirate and forgets its everyday writing after a hundred steps", () => {
    const frame = practised(initial, 100);
    expect(talksLikeAPirate(frame.sample)).toBe(true);
    expect(mission.when(initial, frame)).toBe(true);
    expect(guess.answer(initial, frame)).toBe("worse");
  }, 60_000);

  it("keeps its everyday writing when it rereads half of it", () => {
    const state = at({ mix: 0.5 });
    const frame = practised(state, 100);
    expect(mission.when(state, frame)).toBe(false);
    expect(guess.answer(state, frame)).toBeNull();
  }, 60_000);
});

describe("specialising: links", () => {
  it("keeps a hand-made link inside the dials and never opens practising", () => {
    const safe = definition.parseState!(
      { text: "x", learning: 9, mix: 9, steps: -3, running: true },
      initial,
    );
    expect(safe).toEqual({ text: "x", learning: 0.01, mix: 0.75, steps: 0, running: false });
  });
});

describe("specialising: in the lesson", () => {
  it("practises in the background", async () => {
    render(<ModuleShell lesson={{ ...valleyLesson, id: "specialising-1" }} module={definition} />);
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
  }, 60_000);
});

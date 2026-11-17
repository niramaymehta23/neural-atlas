import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { isFinished, studyRun, type StudyFrame, type StudyState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as StudyState;
const at = (change: Partial<StudyState>): StudyState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: StudyState) => [...studyRun(state)].at(-1) as StudyFrame;
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell lesson={{ ...valleyLesson, id: `study-${(lessons += 1)}` }} module={definition} />,
  );

describe("memorising vs understanding: the student", () => {
  it("practising shrinks the mistakes on the past papers", () => {
    const frames = [...studyRun(at({}))];
    expect(frames.at(-1)?.loss).toBeLessThan((frames[0]?.loss ?? 0) / 2);
  });

  it("is the same run every time, so a link replays it", () => {
    expect([...studyRun(at({ cells: 5 }))]).toEqual([...studyRun(at({ cells: 5 }))]);
  });

  it("a small student with plenty of papers does about as well on the exam", () => {
    const state = at({ cells: 3, questions: 20 });
    expect(guess.answer(state, lastOf(state))).toBe("same");
    expect(mission.when(state, lastOf(state))).toBe(false);
  });

  it("a big student with a few papers aces the practice and fails the exam", () => {
    const state = at({ cells: 24, questions: 6 });
    const end = lastOf(state);
    expect(mission.when(state, end)).toBe(true);
    expect(guess.answer(state, end)).toBe("worse");
  });

  it("waits for a finished run of these very settings", () => {
    const state = at({ cells: 24, questions: 6 });
    const frames = [...studyRun(state)];
    expect(mission.when(state, frames[3])).toBe(false);
    expect(isFinished({ ...state, cells: 12 }, frames.at(-1))).toBe(false);
    expect(guess.answer(state, undefined)).toBeNull();
  });
});

describe("memorising vs understanding: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { cells: 99, questions: -4, runs: Number.NaN } as unknown as StudyState,
      initial,
    ) as StudyState;
    expect(safe).toEqual({ cells: 24, questions: 4, runs: 0 });
  });

  it("describes the page before and after practice", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/hasn’t practised/);
    const state = at({ cells: 24, questions: 6 });
    expect(definition.describe?.(state, lastOf(state))).toMatch(/new exam/);
  });
});

describe("memorising vs understanding: in the lesson", () => {
  it("earns the star once a big student with few papers fails the exam", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    const cells = screen.getByRole("slider", { name: words.cells.label });
    cells.focus();
    await userEvent.keyboard("{End}");
    const questions = screen.getByRole("slider", { name: words.questions.label });
    questions.focus();
    await userEvent.keyboard("{Home}{ArrowRight}{ArrowRight}");
    await userEvent.click(screen.getByRole("button", { name: words.practice }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
    // The curve is drawn from the frame being played, which follows the recorded run a moment later.
    await waitFor(() => expect(document.querySelector("[data-answers]")).not.toBeNull(), {
      timeout: 5000,
    });
  });
});

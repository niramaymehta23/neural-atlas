import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { gatesRun, isFinished, type GatesFrame, type GatesState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as GatesState;
const at = (change: Partial<GatesState>): GatesState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: GatesState) => [...gatesRun(state)].at(-1) as GatesFrame;
const SHUT = { keep: "shut", letIn: "shut", readOut: "shut" } as const;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `choosing-what-to-remember-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("choosing what to remember: the run", () => {
  it("remembers across long sentences with gates, and forgets without them", () => {
    expect(lastOf(at({})).right).toBeGreaterThan(0.9);
    expect(lastOf(at({ cell: "plain" })).right).toBeLessThan(0.65);
  });

  it("does not practise again when only the gates change", () => {
    expect(lastOf(at({ ...SHUT })).params).toEqual(lastOf(at({})).params);
  });
});

describe("choosing what to remember: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when every gate of the practised reader is shut", () => {
    const shut = at({ ...SHUT });
    expect(mission.when(shut, lastOf(shut))).toBe(true);
  });

  it("does not fire with any gate still free, or before practice ends", () => {
    const two = at({ keep: "shut", letIn: "shut" });
    expect(mission.when(two, lastOf(two))).toBe(false);
    const shut = at({ ...SHUT });
    expect(mission.when(shut, [...gatesRun(shut)][1])).toBe(false);
  });

  it("answers from the gates it learned, whatever the learner has set", () => {
    expect(guess.answer(at({}), lastOf(at({})))).toBe("yes");
    const shut = at({ ...SHUT });
    expect(guess.answer(shut, lastOf(shut))).toBe("yes");
    const short = at({ length: 6 });
    expect(guess.answer(short, lastOf(short))).toBeNull();
  });
});

describe("choosing what to remember: links and words", () => {
  it("keeps a hand-made link on its dials and choices", () => {
    const safe = definition.parseState!(
      {
        length: 1,
        step: 9,
        start: "rainy",
        keep: "ajar",
        letIn: "shut",
        readOut: 3,
        cell: "spiky",
        runs: -1,
      } as unknown as GatesState,
      initial,
    ) as GatesState;
    expect(safe).toEqual({ ...initial, length: 3, step: 1, start: "rainy", letIn: "shut" });
  });

  it("compares the gated reader with a plain one", () => {
    expect(definition.compare?.(initial)).toEqual({ ...initial, cell: "plain" });
  });

  it("describes the reader with the gates as set", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/waiting for the reader/);
    const shut = at({ ...SHUT });
    const end = lastOf(shut);
    expect(isFinished(shut, end)).toBe(true);
    expect(definition.describe?.(shut, end)).toMatch(/tossing a coin/);
    expect(definition.describe?.(at({}), lastOf(at({})))).toMatch(/nearly always/);
  });
});

describe("choosing what to remember: in the lesson", () => {
  it("earns the star once every gate is shut after practice", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    await waitFor(() => expect(document.querySelector("[data-memory=remembers]")).not.toBeNull(), {
      timeout: 10_000,
    });
    for (const gate of ["keep", "letIn", "readOut"] as const) {
      const group = screen.getByRole("radiogroup", { name: words.gates[gate].label });
      await userEvent.click(within(group).getByRole("radio", { name: words.gates.modes.shut }));
    }
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(document.querySelector("[data-memory=guessing]")).not.toBeNull();
  });
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { frameOf, LIMIT, NEVER, runOf, type AgentFrame, type AgentState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as AgentState;
const at = (change: Partial<AgentState>): AgentState => ({ ...initial, ...change }) as AgentState;
const all = (state: AgentState): AgentState => ({ ...state, shown: LIMIT });
const shown = (state: AgentState): AgentFrame => ({ ...frameOf(state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("ai that takes actions: the agent", () => {
  it("finishes both jobs when every tool works", () => {
    expect(runOf(initial).outcome).toBe("done");
    expect(runOf(at({ task: 1 })).outcome).toBe("done");
  });

  it("gives up honestly after its tries run out", () => {
    const run = runOf(at({ broken: "weather", patience: 2 }));
    expect(run.outcome).toBe("gaveUp");
    expect(run.steps.filter(({ kind }) => kind === "failed")).toHaveLength(2);
  });

  it("loops until the safety limit when it never gives up", () => {
    const run = runOf(at({ broken: "converter", patience: NEVER }));
    expect(run.outcome).toBe("loop");
    expect(run.steps.length).toBeLessThanOrEqual(LIMIT);
    expect(run.steps.at(-1)?.kind).toBe("stopped");
  });

  it("ignores a broken tool the job doesn't use", () => {
    expect(runOf(at({ task: 1, broken: "weather", patience: NEVER })).outcome).toBe("done");
  });
});

describe("ai that takes actions: mission and guess", () => {
  it("fires once the whole loop is on screen", () => {
    const state = all(at({ broken: "weather", patience: NEVER }));
    expect(mission.when(state, shown(state))).toBe(true);
    expect(guess.answer(state, shown(state))).toBe("forever");
    const part = at({ broken: "weather", patience: NEVER, shown: 3 });
    expect(mission.when(part, shown(part))).toBe(false);
    expect(guess.answer(part, shown(part))).toBeNull();
    const patient = all(at({ broken: "weather", patience: 4 }));
    expect(mission.when(patient, shown(patient))).toBe(false);
  });
});

describe("ai that takes actions: links", () => {
  it("keeps a hand-made link to a real job, tool and dials", () => {
    expect(
      definition.parseState!({ task: 9, broken: "laser", patience: 50, shown: -1 }, initial),
    ).toEqual({
      task: 1,
      broken: "none",
      patience: NEVER,
      shown: 1,
    });
  });
});

describe("ai that takes actions: in the lesson", () => {
  it("earns the star by breaking a tool and never giving up", async () => {
    render(
      <ModuleShell
        lesson={{ ...valleyLesson, id: "ai-that-takes-actions-1" }}
        module={definition}
      />,
    );
    await userEvent.click(
      screen.getByRole("radio", { name: words.brokenTool("the weather tool") }),
    );
    screen.getByRole("slider", { name: words.patience.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.all }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
    expect(document.querySelector("[data-outcome=loop]")).not.toBeNull();
  });
});

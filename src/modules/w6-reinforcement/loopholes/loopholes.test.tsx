import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { dayRun, isFinished, withFound, type LoopholeFrame, type LoopholeState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as LoopholeState;
const at = (change: Partial<LoopholeState>): LoopholeState => ({ ...initial, runs: 1, ...change });
const dayOf = (state: LoopholeState) =>
  [...dayRun(state)].filter((frame): frame is LoopholeFrame => frame !== null);
const lastOf = (state: LoopholeState) => dayOf(state).at(-1) as LoopholeFrame;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `loopholes-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("loopholes: the robot's days (measured on the bedroom)", () => {
  it("tidies up at the starting dials", () => {
    expect(lastOf(at({})).behaviour).toBe("tidy");
    expect(lastOf(at({})).happened).toBe("bed");
  });

  it("finds a loophole for each switch, and one when moves cost a lot", () => {
    expect(lastOf(at({ pickup: true })).behaviour).toBe("juggles");
    expect(lastOf(at({ closer: true })).behaviour).toBe("paces");
    // Measured: at the starting treat the puddle wins from "quite a lot" (0.45 on the dial) up.
    expect(lastOf(at({ moveCost: 0.45 })).behaviour).toBe("puddle");
    expect(lastOf(at({ moveCost: 0.3 })).behaviour).toBe("tidy");
  });

  it("a big enough treat for tidying closes the pacing loophole", () => {
    expect(lastOf(at({ closer: true, boxTreat: 1 })).behaviour).toBe("tidy");
  });

  it("is the same day every time, with breaths while it plans", () => {
    const frames = [...dayRun(at({ closer: true }))];
    expect(frames.some((frame) => frame === null)).toBe(true);
    expect(dayOf(at({ closer: true }))).toEqual(dayOf(at({ closer: true })));
  });

  it("keeps each loophole once", () => {
    expect(withFound([], "tidy")).toEqual([]);
    expect(withFound(["paces"], "paces")).toEqual(["paces"]);
    expect(withFound(["paces"], "puddle")).toEqual(["paces", "puddle"]);
  });
});

describe("loopholes: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires once all three loopholes are found", () => {
    expect(mission.when(at({ found: ["juggles", "paces", "puddle"] }))).toBe(true);
    expect(mission.when(at({ found: ["juggles", "paces"] }))).toBe(false);
  });

  it("answers the pick-up question from a finished day with the switch on", () => {
    const state = at({ pickup: true });
    expect(guess.answer(state, lastOf(state))).toBe("trick");
    expect(guess.answer(at({}), lastOf(at({})))).toBeNull();
    expect(guess.answer(state, dayOf(state)[0])).toBeNull();
    expect(isFinished(state, lastOf(state))).toBe(true);
  });
});

describe("loopholes: links and words", () => {
  it("keeps a hand-made link on its dials, with known loopholes once", () => {
    const safe = definition.parseState!(
      {
        boxTreat: 7,
        moveCost: -2,
        pickup: true,
        closer: false,
        runs: -4,
        found: ["paces", "paces", "teleports", 3, "puddle"],
      } as unknown as LoopholeState,
      initial,
    ) as LoopholeState;
    expect(safe).toEqual({
      boxTreat: 1,
      moveCost: 0,
      pickup: true,
      closer: false,
      runs: 0,
      found: ["paces", "puddle"],
    });
  });

  it("describes the day", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(at({}), undefined)).toBe(words.describe.working);
    expect(definition.describe?.(at({ pickup: true }), lastOf(at({ pickup: true })))).toContain(
      words.behaviour.juggles,
    );
  });
});

describe("loopholes: in the lesson", () => {
  it("plays the robot's day and collects the loopholes it finds, for the star", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    await waitFor(() => expect(screen.getByText(words.behaviour.tidy)).toBeInTheDocument(), {
      timeout: 10_000,
    });
    await userEvent.click(screen.getByRole("switch", { name: words.pickup }));
    await waitFor(() => expect(screen.getByText(words.behaviour.juggles)).toBeInTheDocument(), {
      timeout: 10_000,
    });
    await userEvent.click(screen.getByRole("switch", { name: words.pickup }));
    await userEvent.click(screen.getByRole("switch", { name: words.closer }));
    await waitFor(() => expect(screen.getByText(words.behaviour.paces)).toBeInTheDocument(), {
      timeout: 10_000,
    });
    await userEvent.click(screen.getByRole("switch", { name: words.closer }));
    screen.getByRole("slider", { name: words.moveCost.label }).focus();
    await userEvent.keyboard("{End}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(screen.getByText(words.found.tally(3))).toBeInTheDocument();
  }, 40_000);
});

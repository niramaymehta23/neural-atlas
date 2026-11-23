import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAgentRun } from "@/engine/rl/agent-host";
import { randomScore } from "@/engine/rl/ppo";
import { practiseAgentsInProcess } from "@/engine/rl/testing/in-process-agent";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  BOARD,
  CLIP_STOPS,
  configOf,
  fellApart,
  frameOf,
  MOST_BATCHES,
  MOST_ROUNDS,
  NO_RAIL,
  RANDOM_SCORE,
  ROSE,
  ROUND_STOPS,
  runOf,
  START,
  type CoachFrame,
  type CoachState,
} from "./model";
import { predictions } from "./predictions";

practiseAgentsInProcess();

const initial = definition.initialState as CoachState;
const at = (change: { clip?: number; rounds?: number; attempt?: number }): CoachState => ({
  ...initial,
  ...change,
});
const [mission] = missions;
const [guess] = predictions;

/** Every frame of a run, as the lesson records them (one per batch). */
function frames(state: CoachState): CoachFrame[] {
  const run = createAgentRun(configOf(state));
  const recorded = [frameOf(run.moment(), runOf(state))];
  while (run.step < MOST_BATCHES) {
    run.advance();
    recorded.push(frameOf(run.moment(), runOf(state)));
  }
  return recorded;
}

const noRail = at({ clip: NO_RAIL, rounds: MOST_ROUNDS });
const noRailRun = frames(noRail);

describe("player and coach: what the mission rests on", () => {
  it("scores a random player at about −1, the line's faint reference", () => {
    expect(randomScore(BOARD)).toBeCloseTo(RANDOM_SCORE, 2);
  });

  it("with no rail and the most study rounds, climbs and then falls apart", () => {
    const climbed = noRailRun.find((frame) => frame.score >= ROSE);
    const fell = noRailRun.find(fellApart);
    expect(climbed?.step).toBe(3);
    expect(fell?.step).toBe(9);
    expect(noRailRun.at(-1)?.score).toBeLessThan(-0.8);
  });

  it("never falls apart with either of the two smallest rails, at any number of study rounds", () => {
    for (const clip of [0, 1])
      for (let rounds = 0; rounds < ROUND_STOPS.length; rounds += 1) {
        const run = frames(at({ clip, rounds }));
        expect(run.some(fellApart)).toBe(false);
        expect(run.at(-1)?.score).toBeGreaterThanOrEqual(0.54);
      }
  }, 30_000);

  it("never falls apart with no rail and up to twenty study rounds", () => {
    for (let rounds = 0; rounds < MOST_ROUNDS; rounds += 1)
      expect(frames(at({ clip: NO_RAIL, rounds })).some(fellApart)).toBe(false);
  }, 30_000);

  it("earns far more than a random player at the starting dials", () => {
    expect(frames(initial).at(-1)?.score).toBeGreaterThanOrEqual(RANDOM_SCORE + 1.5);
  });
});

describe("player and coach: mission and guess", () => {
  it("fires when the player falls apart with no rail, and the guess says so", () => {
    const fell = noRailRun.find(fellApart);
    expect(mission.when(noRail, fell)).toBe(true);
    expect(guess.answer(noRail, fell)).toBe("falls");
  });

  it("waits while it is still climbing, and only judges the run the dials ask for", () => {
    const climbing = noRailRun.find((frame) => frame.step === 5);
    expect(mission.when(noRail, climbing)).toBe(false);
    expect(guess.answer(noRail, climbing)).toBeNull();
    const fell = noRailRun.find(fellApart);
    expect(mission.when({ ...noRail, attempt: 1 }, fell)).toBe(false);
    expect(mission.when(noRail, undefined)).toBe(false);
  });

  it("does not fire with the rail on; the guess is told only with no rail and the most rounds", () => {
    const railed = at({ rounds: MOST_ROUNDS });
    const end = frames(railed).at(-1);
    expect(mission.when(railed, end)).toBe(false);
    expect(guess.answer(railed, end)).toBeNull();
    const fewRounds = at({ clip: NO_RAIL });
    expect(guess.answer(fewRounds, frames(fewRounds).at(-1))).toBeNull();
  });
});

describe("player and coach: links and words", () => {
  it("keeps a hand-made link on the dials and never opens practising", () => {
    const safe = definition.parseState?.(
      { clip: 12, rounds: -4, attempt: 2.4, steps: 1e9, running: true },
      initial,
    );
    expect(safe).toEqual({
      clip: CLIP_STOPS.length - 1,
      rounds: 0,
      attempt: 2,
      steps: MOST_BATCHES,
      running: false,
    });
  });

  it("says how far it has got and how well the player does", () => {
    expect(definition.describe?.(initial, undefined)).toBe("It hasn't practised yet.");
    expect(definition.describe?.(noRail, noRailRun.at(-1))).toBe(
      "40 batches of tries, all it gets here. The player mostly steps in the lava or gets lost.",
    );
  });

  it("compares with the rail switched the other way", () => {
    expect(definition.compare?.(initial).clip).toBe(NO_RAIL);
    expect(definition.compare?.(noRail).clip).toBe(START.clip);
  });
});

describe("player and coach: in the lesson", () => {
  it("practises in the worker and earns the star once the rail is off", async () => {
    render(<ModuleShell lesson={{ ...valleyLesson, id: "coach-1" }} module={definition} />);
    const scene = await screen.findByTestId("player-and-coach");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    within(dock).getByRole("slider", { name: words.clip.label }).focus();
    await userEvent.keyboard("{End}");
    within(dock).getByRole("slider", { name: words.rounds.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(within(dock).getByRole("button", { name: words.practise }));
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(Number(scene.getAttribute("data-step"))).toBeGreaterThanOrEqual(9);
    expect(scene.querySelectorAll("[data-arrow=best]").length).toBeGreaterThan(0);
  }, 30_000);
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  BEST,
  BUDGET,
  CHANCES,
  CURIOUS,
  EVERY,
  favouriteOf,
  isFinished,
  MACHINES,
  raceRun,
  stuckOnWorse,
  yourResults,
  YOUR_PULLS,
  type CasinoState,
  type RaceFrame,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as CasinoState;
const at = (change: Partial<CasinoState>): CasinoState => ({ ...initial, races: 1, ...change });
const lastOf = (state: CasinoState) => [...raceRun(state)].at(-1) as RaceFrame;
const BUDGETS = Array.from(
  { length: (BUDGET.max - BUDGET.min) / BUDGET.step + 1 },
  (_, step) => BUDGET.min + step * BUDGET.step,
);
const HEART = MACHINES.indexOf("heart");
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `new-or-favourite-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("new or favourite: the casino", () => {
  it("hides a clearly best machine, the Bell", () => {
    expect(CHANCES).toEqual([0.55, 0.35, 0.45, 0.7, 0.2]);
    expect(MACHINES[BEST]).toBe("bell");
  });

  it("replays your pulls from their tapes, and a new game draws afresh", () => {
    const pulls = [0, 0, 3, 3, 3, 1, 0];
    expect(yourResults({ pulls, plays: 0 })).toEqual(yourResults({ pulls, plays: 0 }));
    const many = Array.from({ length: YOUR_PULLS }, () => 3);
    expect(yourResults({ pulls: many, plays: 0 })).not.toEqual(
      yourResults({ pulls: many, plays: 1 }),
    );
  });

  it("records the race every ten pulls, from the start to the last pull", () => {
    const frames = [...raceRun(at({ budget: 300 }))];
    expect(frames.map(({ epoch }) => epoch)).toEqual(
      Array.from({ length: 300 / EVERY + 1 }, (_, step) => step * EVERY),
    );
    const last = frames.at(-1) as RaceFrame;
    expect(last.bots[0].counts.reduce((sum, pulls) => sum + pulls, 0)).toBe(300);
    expect([...raceRun(at({ budget: 300 }))]).toEqual(frames);
  });

  it("beats a random player with both bots at the starting dials", () => {
    const last = lastOf(at({}));
    const random = (last.budget * CHANCES.reduce((sum, chance) => sum + chance, 0)) / 5;
    expect(last.bots[0].wins).toBeGreaterThan(random * 1.2);
    expect(last.bots[1].wins).toBeGreaterThan(random * 1.15);
  });
});

describe("new or favourite: mission and guess", () => {
  it("never tries anything new: stuck on the Heart at every budget (measured)", () => {
    for (const budget of BUDGETS) {
      const state = at({ curious: 0, budget });
      const last = lastOf(state);
      // Two misses elsewhere, then the Heart pays on its third pull and it never leaves.
      expect(favouriteOf(last.bots[0]).machine).toBe(HEART);
      expect(last.bots[0].counts[HEART]).toBe(budget - 2);
      expect(stuckOnWorse(last)).toBe(true);
      expect(mission.when(state, last)).toBe(true);
      // The guess: the hopeful bot ends ahead, by at least a quarter.
      expect(last.bots[1].wins).toBeGreaterThanOrEqual(last.bots[0].wins * 1.25);
      expect(guess.answer(state, last)).toBe("hopeful");
    }
  });

  it("does not fire for a curious bot, an unfinished race, or another setting's race", () => {
    const curious = at({});
    expect(mission.when(curious, lastOf(curious))).toBe(false);
    expect(stuckOnWorse(lastOf(curious))).toBe(false);
    const never = at({ curious: 0 });
    const frames = [...raceRun(never)];
    expect(mission.when(never, frames[5])).toBe(false);
    expect(isFinished(never, frames[5])).toBe(false);
    expect(mission.when(at({ curious: 0, budget: 500 }), frames.at(-1))).toBe(false);
  });

  it("keeps the guess waiting until a race with no curiosity ends", () => {
    expect(guess.answer(at({}), lastOf(at({})))).toBeNull();
    expect(guess.answer(at({ curious: 0 }), undefined)).toBeNull();
  });
});

describe("new or favourite: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      {
        pulls: [0, 4, 5, -1, 2.5, "x", 3, ...new Array(80).fill(1)],
        plays: -3,
        curious: 4,
        budget: 333,
        races: -1,
      } as unknown as CasinoState,
      initial,
    ) as CasinoState;
    expect(safe.pulls).toHaveLength(YOUR_PULLS);
    expect(safe.pulls.slice(0, 3)).toEqual([0, 4, 3]);
    expect(safe).toMatchObject({ plays: 0, curious: CURIOUS.max, budget: 350, races: 0 });
  });

  it("describes your coins and the race", () => {
    expect(definition.describe?.(initial, undefined)).toBe(
      "You have pulled zero times and won zero coins. The bots haven't raced yet.",
    );
    const never = at({ curious: 0 });
    expect(definition.describe?.(never, lastOf(never))).toMatch(
      /^You have pulled zero times.*The race is over/,
    );
  });
});

describe("new or favourite: in the lesson", () => {
  it("pulls a machine and counts your coins", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: /Pull the Bell machine/ }));
    expect(screen.getByTestId("new-or-favourite")).toHaveAttribute("data-pulls", "1");
    expect(screen.getByText(/pulls left/)).toBeInTheDocument();
  });

  it("earns the star when a bot with no curiosity races", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.curious.label }).focus();
    await userEvent.keyboard("{Home}");
    await userEvent.click(screen.getByRole("button", { name: words.race.start }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 15_000);
});

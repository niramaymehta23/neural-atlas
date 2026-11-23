import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { randomWalkerSuccess } from "@/engine/rl/policy-gradient";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { nudgeWords } from "./controls";
import { definition } from "./index";
import { missions } from "./missions";
import {
  DEFAULT_NUDGE,
  goneWild,
  habitRun,
  isFinished,
  LOCKED,
  RECENT,
  TRIES,
  WALKER_SUCCESS,
  WILD,
  WORLD,
  type HabitFrame,
  type HabitState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as HabitState;
const at = (change: Partial<HabitState>): HabitState => ({ ...initial, runs: 1, ...change });
const framesOf = (state: HabitState) => [...habitRun(state)];
const lastOf = (state: HabitState) => framesOf(state).at(-1) as HabitFrame;
const PUPPIES = Array.from({ length: 20 }, (_, attempt) => attempt);

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `nudging-habits-${(lessons += 1)}` }}
      module={definition}
    />,
  );

// Worked out once and reused: a run is a few tens of milliseconds.
const usual = framesOf(at({}));
const usualEnd = usual.at(-1) as HabitFrame;
const wild = lastOf(at({ nudge: 1 }));

describe("nudging habits: the run", () => {
  it("starts with even habits and records a moment every ten tries", () => {
    expect(usual).toHaveLength(TRIES / 10 + 1);
    expect(usual[0]?.tries).toBe(0);
    expect(Array.from(usual[0]?.chances ?? []).every((chance) => chance === 0.25)).toBe(true);
    expect(usualEnd.tries).toBe(TRIES);
    expect(isFinished(at({}), usualEnd)).toBe(true);
  });

  it("learns to reach the bowl far more often than a puppy stepping at random", () => {
    expect(usualEnd.recent).toBeGreaterThanOrEqual(0.8);
    expect(randomWalkerSuccess(WORLD, 1000, 1)).toBe(WALKER_SUCCESS);
  });

  it("replays the same run for a link", () => {
    const again = framesOf(at({}));
    expect(again.map((frame) => frame.recent)).toEqual(usual.map((frame) => frame.recent));
    expect(Array.from(again.at(-1)?.chances ?? [])).toEqual(Array.from(usualEnd.chances));
  });

  it("measures the latest tries over a window of a hundred", () => {
    expect(RECENT).toBe(100);
    expect(usual[1]?.recent).toBeLessThanOrEqual(1);
  });

  // The measurement behind WILD, GONE_WILD and LOCKED (see model.ts).
  it("goes wild for every puppy at the hardest nudge and none at the usual one", () => {
    for (const attempt of PUPPIES) {
      expect(goneWild(lastOf(at({ nudge: 1, attempt })))).toBe(true);
      const calm = lastOf(at({ attempt }));
      expect(calm.recent).toBeGreaterThanOrEqual(0.86);
      expect(goneWild(calm)).toBe(false);
    }
    const wildAtEdge = PUPPIES.filter((attempt) => goneWild(lastOf(at({ nudge: WILD, attempt }))));
    expect(wildAtEdge.length).toBeGreaterThanOrEqual(18);
  }, 30_000);
});

describe("nudging habits: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires once a run at the hardest nudge has locked onto a habit that rarely works", () => {
    expect(wild.sure).toBeGreaterThanOrEqual(LOCKED);
    expect(mission.when(at({ nudge: 1 }), wild)).toBe(true);
  });

  it("does not fire for the usual nudge, an unfinished run or another run's moment", () => {
    expect(mission.when(at({}), usualEnd)).toBe(false);
    const early = framesOf(at({ nudge: 1 }))[5];
    expect(mission.when(at({ nudge: 1 }), early)).toBe(false);
    expect(mission.when(at({ nudge: 1, attempt: 3 }), wild)).toBe(false);
    // Wild-looking habits from a gentler dial are not the mission.
    expect(mission.when(at({ nudge: DEFAULT_NUDGE }), { ...usualEnd, recent: 0, sure: 1 })).toBe(
      false,
    );
  });

  it("answers the lucky-try question from the run on screen", () => {
    expect(usualEnd.lucky?.then).toBe("more");
    expect(guess.answer(at({}), usualEnd)).toBe("more");
    expect(guess.answer(at({}), usual[0])).toBeNull();
    expect(guess.answer(at({ batch: 9 }), usualEnd)).toBeNull();
    expect(guess.answer(at({}), undefined)).toBeNull();
  });

  // Measured: every puppy at the usual dials sees its lucky try made more likely.
  it("makes the lucky try more likely for every puppy at the usual dials", () => {
    for (const attempt of PUPPIES) expect(lastOf(at({ attempt })).lucky?.then).toBe("more");
  }, 30_000);
});

describe("nudging habits: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { nudge: 7, batch: 99.4, attempt: -3, runs: 1e9 } as unknown as HabitState,
      initial,
    );
    expect(safe).toEqual({ nudge: 1, batch: 20, attempt: 0, runs: 10_000 });
    expect(definition.parseState!({ nudge: -1, batch: 0, attempt: 2.6, runs: 2 }, initial)).toEqual(
      { nudge: 0, batch: 1, attempt: 3, runs: 2 },
    );
  });

  it("describes the puppy before, during and after practice", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(at({}), usual[3])).toBe(words.describe.working);
    expect(definition.describe?.(at({}), usualEnd)).toMatch(/^The puppy has practised\. Lately/);
  });

  it("calls the hardest nudges an enormous shove, from where they really go wild", () => {
    expect(nudgeWords(WILD)).toBe(words.nudge.wild);
    expect(nudgeWords(WILD - 0.01)).not.toBe(words.nudge.wild);
    expect(nudgeWords(DEFAULT_NUDGE)).toBe(words.nudge.firm);
  });
});

describe("nudging habits: in the lesson", () => {
  it("bends the arrows once it practises", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    await waitFor(
      () =>
        expect(document.querySelector("[data-testid=nudging-habits]")).toHaveAttribute(
          "data-tries",
          String(TRIES),
        ),
      { timeout: 10_000 },
    );
    expect(document.querySelector("[data-arrow=best]")).not.toBeNull();
    expect(document.querySelector("[data-reached]")).toHaveTextContent(
      /Lately it reaches its bowl/,
    );
  }, 15_000);

  it("earns the star once a huge nudge goes wild", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.nudge.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 15_000);
});

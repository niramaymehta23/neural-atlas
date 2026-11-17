import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  catNearer,
  isFinished,
  mapRun,
  ONE_SPOT,
  PICKED,
  squashed,
  type MapFrame,
  type MapState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as MapState;
const at = (change: Partial<MapState>): MapState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: MapState) => [...mapRun(state)].at(-1) as MapFrame;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `meaning-as-places-${(lessons += 1)}` }}
      module={definition}
    />,
  );

const spread = lastOf(at({}));
const flat = lastOf(at({ push: 0 }));

describe("meaning as places: the map", () => {
  it("finds every picked word in the sentences", () => {
    expect(PICKED.every(({ at }) => at >= 0)).toBe(true);
  });

  it("gathers words of the same kind when they push apart", () => {
    // Measured (seed 7, 400 rounds): 10 or more of the 12 for every dial setting tried.
    for (const push of [0.1, 0.4, 1]) {
      for (const step of [0, 0.5, 1]) {
        const end = lastOf(at({ push, step }));
        expect(end.gathered).toBeGreaterThanOrEqual(10);
        expect(squashed(end)).toBe(false);
      }
    }
    expect(catNearer(spread.places)).toBe("dog");
  });

  it("squashes every word into one spot with no push, at every step", () => {
    // Measured: the reach ends at 0.051 or less, against 0.99 or more with any push.
    for (const step of [0, 0.5, 1]) {
      expect(lastOf(at({ push: 0, step })).reach).toBeLessThan(ONE_SPOT);
    }
  });

  it("replays the same map for a link", () => {
    expect([...mapRun(at({ step: 0.3 }))]).toEqual([...mapRun(at({ step: 0.3 }))]);
  });
});

describe("meaning as places: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires once a finished map is squashed into one spot", () => {
    expect(mission.when(at({ push: 0 }), flat)).toBe(true);
    expect(mission.when(at({}), spread)).toBe(false);
    expect(mission.when(at({ push: 0 }), [...mapRun(at({ push: 0 }))][1])).toBe(false);
  });

  it("answers from a finished, spread-out map only", () => {
    expect(guess.answer(at({}), spread)).toBe("dog");
    expect(guess.answer(at({ push: 0 }), flat)).toBeNull();
    expect(guess.answer(at({}), undefined)).toBeNull();
  });
});

describe("meaning as places: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { push: 4, step: -1, runs: 1e9 } as unknown as MapState,
      initial,
    ) as MapState;
    expect(safe).toEqual({ push: 1, step: 0, runs: 10_000 });
  });

  it("describes the map before and after", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(isFinished(at({ push: 0 }), flat)).toBe(true);
    expect(definition.describe?.(at({ push: 0 }), flat)).toBe(words.describe.done(words.squashed));
    expect(definition.describe?.(at({}), spread)).toMatch(/nearer to “dog”/);
  });

  it("compares with no pushing, or with pushing when there is none", () => {
    expect(definition.compare?.(at({}))).toMatchObject({ push: 0 });
    expect(definition.compare?.(at({ push: 0 }))).toMatchObject({ push: 0.4 });
  });
});

describe("meaning as places: in the lesson", () => {
  it("draws the map and names the picked words", async () => {
    renderLesson();
    expect(screen.getByText(words.waiting)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    await waitFor(() => expect(document.querySelector("[data-word=cat]")).not.toBeNull(), {
      timeout: 10_000,
    });
    expect(screen.getByText("Ways to travel")).toBeInTheDocument();
  }, 15_000);

  it("earns the star once every word is squashed into one spot", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.push.label }).focus();
    await userEvent.keyboard("{Home}");
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 20_000,
    });
    // The star replays the run, so wait for the finished map to come back round.
    await waitFor(() => expect(document.querySelector("[data-squashed]")).not.toBeNull(), {
      timeout: 20_000,
    });
  }, 30_000);
});

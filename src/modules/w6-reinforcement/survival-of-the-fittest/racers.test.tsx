import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { changeWords } from "./controls";
import { definition } from "./index";
import { missions } from "./missions";
import {
  cleanRoad,
  COPIES,
  gainOf,
  GENERATIONS,
  hasWayRound,
  isFinished,
  raceRun,
  ROAD,
  STALL,
  START,
  TRACKS,
  WILD_CHANGE,
  type RaceFrame,
  type RaceState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as RaceState;
const at = (change: Partial<RaceState>): RaceState => ({ ...initial, runs: 1, ...change });
const framesOf = (state: RaceState) =>
  [...raceRun(state)].filter((item): item is RaceFrame => item !== null);
const lastOf = (state: RaceState) => framesOf(state).at(-1) as RaceFrame;
const ATTEMPTS = Array.from({ length: 20 }, (_, attempt) => attempt);

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `survival-of-the-fittest-${(lessons += 1)}` }}
      module={definition}
    />,
  );

// Worked out once and reused: fifty races take a few tens of milliseconds.
const usual = framesOf(at({}));
const usualEnd = usual.at(-1) as RaceFrame;
const wild = lastOf(at({ change: 1 }));
const copies = lastOf(at({ change: 0 }));

describe("survival of the fittest: the races", () => {
  it("records one moment per race, and pauses after every car", () => {
    const items = [...raceRun(at({ cars: 4 }))];
    expect(items.filter((item) => item === null)).toHaveLength(4 * GENERATIONS);
    expect(usual).toHaveLength(GENERATIONS);
    expect(usual.map((frame) => frame.generation)).toEqual(
      Array.from({ length: GENERATIONS }, (_, index) => index),
    );
    expect(usualEnd.trails).toHaveLength(initial.cars);
    expect(isFinished(at({}), usualEnd)).toBe(true);
  });

  it("breeds cars that drive far further than the first race's best", () => {
    expect(gainOf(usualEnd)).toBeGreaterThanOrEqual(60);
  });

  it("replays the same races for a link", () => {
    expect(framesOf(at({})).map((frame) => frame.furthest)).toEqual(
      usual.map((frame) => frame.furthest),
    );
  });

  // The measurement behind WILD_CHANGE and STALL (see model.ts).
  it("stalls at the top of the change dial and improves at the usual setting, for every set of cars", () => {
    for (const attempt of ATTEMPTS) {
      expect(gainOf(lastOf(at({ change: 1, attempt })))).toBeLessThanOrEqual(8);
      expect(gainOf(lastOf(at({ change: WILD_CHANGE, attempt })))).toBeLessThanOrEqual(8);
      expect(gainOf(lastOf(at({ attempt })))).toBeGreaterThanOrEqual(94);
    }
  }, 60_000);

  it("runs nothing on a track with no way round", () => {
    const broken = TRACKS.twisty.slice(0, START + 1) + "." + TRACKS.twisty.slice(START + 2);
    expect(hasWayRound(broken)).toBe(false);
    expect([...raceRun(at({ road: broken }))]).toEqual([]);
    for (const road of Object.values(TRACKS)) expect(hasWayRound(road)).toBe(true);
  });
});

describe("survival of the fittest: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when nearly brand-new cars every race leave the best no better", () => {
    expect(gainOf(wild)).toBeLessThanOrEqual(STALL);
    expect(mission.when(at({ change: 1 }), wild)).toBe(true);
  });

  it("does not fire for small changes, unfinished races or another run's moment", () => {
    expect(mission.when(at({}), usualEnd)).toBe(false);
    const early = framesOf(at({ change: 1 }))[3];
    expect(mission.when(at({ change: 1 }), early)).toBe(false);
    expect(mission.when(at({ change: 1, attempt: 2 }), wild)).toBe(false);
    expect(mission.when(at({ change: WILD_CHANGE - 0.01 }), { ...wild, key: "" })).toBe(false);
  });

  it("answers the exact-copies question from finished races with no change", () => {
    expect(gainOf(copies)).toBe(0);
    expect(guess.answer(at({ change: 0 }), copies)).toBe("same");
    expect(guess.answer(at({}), usualEnd)).toBeNull();
    expect(guess.answer(at({ change: 0 }), framesOf(at({ change: 0 }))[2])).toBeNull();
  });
});

describe("survival of the fittest: links and words", () => {
  it("keeps a hand-made link on its dials and its track the right shape", () => {
    const safe = definition.parseState!(
      {
        road: "#".repeat(500),
        brush: "lava",
        change: 4,
        cars: 1,
        attempt: -2,
        runs: 1e9,
      } as unknown as RaceState,
      initial,
    ) as RaceState;
    expect(safe.road).toBe("#".repeat(70));
    expect(safe).toMatchObject({ brush: "road", change: 1, cars: 4, attempt: 0, runs: 10_000 });
    const short = definition.parseState!({ ...initial, road: "x" }, initial) as RaceState;
    expect(short.road[START]).toBe(ROAD);
    expect(short.road.replaceAll(".", "")).toBe(ROAD);
    expect(cleanRoad(TRACKS.loop)).toBe(TRACKS.loop);
  });

  it("describes the races before, during and after", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(at({}), usual[4])).toBe(words.describe.working);
    expect(definition.describe?.(at({}), usualEnd)).toMatch(
      /^The races are over\. The best car got/,
    );
  });

  it("names the dial's ends for what the children really are", () => {
    expect(changeWords(0)).toBe(words.change.copies);
    expect(changeWords(COPIES)).not.toBe(words.change.copies);
    expect(changeWords(WILD_CHANGE)).toBe(words.change.wild);
  });
});

describe("survival of the fittest: in the lesson", () => {
  it("races the cars once started", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    await waitFor(
      () =>
        expect(document.querySelector("[data-testid=survival-of-the-fittest]")).toHaveAttribute(
          "data-generation",
          String(GENERATIONS),
        ),
      { timeout: 10_000 },
    );
    expect(document.querySelector("[data-car=best]")).not.toBeNull();
    expect(document.querySelector("[data-furthest-line]")).toHaveTextContent(/The best car got/);
  }, 15_000);

  it("paints the track from the keyboard and says when it has no way round", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("radio", { name: words.brush.grass }));
    const board = screen.getByRole("application");
    board.focus();
    // From the top-left square down to the start's row, then along to the square after it.
    await userEvent.keyboard(`${"{ArrowDown}".repeat(5)}${"{ArrowRight}".repeat(6)}{Enter}`);
    expect(await screen.findByText(words.noWay)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: words.start })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: words.tracks.loop }));
    expect(screen.queryByText(words.noWay)).toBeNull();
  });

  it("earns the star once nearly brand-new cars stop anything improving", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.change.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 15_000);
});

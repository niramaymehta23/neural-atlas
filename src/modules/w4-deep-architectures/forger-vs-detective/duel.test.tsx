import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { lookAt, realLook } from "./faces";
import { definition } from "./index";
import { missions } from "./missions";
import {
  bunching,
  duelRun,
  facesOf,
  isFinished,
  ONE_FACE,
  type DuelFrame,
  type DuelState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as DuelState;
const at = (change: Partial<DuelState>): DuelState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: DuelState) => [...duelRun(state)].at(-1) as DuelFrame;
/** The first `count` frames of a duel; the run is lazy, so only these are worked out. */
const firstOf = (state: DuelState, count: number) => {
  const frames: DuelFrame[] = [];
  for (const frame of duelRun(state)) {
    frames.push(frame);
    if (frames.length === count) break;
  }
  return frames;
};

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `forger-vs-detective-${(lessons += 1)}` }}
      module={definition}
    />,
  );

// Measured once, reused: a duel takes a fraction of a second.
const steady = lastOf(at({}));
const eager = lastOf(at({ tries: 8, forger: 1 }));

describe("forger vs detective: the duel", () => {
  it("lets a steady duel teach the forger many faces", () => {
    expect(facesOf(steady)).toBeGreaterThanOrEqual(4);
    expect(steady.bunched).toBeLessThan(0.5);
  });

  it("makes an over-eager forger draw the same face every time", () => {
    // Measured (seed 1): with eight tries and a rushing forger, every detective speed tried
    // (0, 0.2, 0.46, 0.6 on its dial) ends with all fakes in one place.
    expect(eager.bunched).toBeGreaterThanOrEqual(ONE_FACE);
    for (const detective of [0, 0.6]) {
      expect(lastOf(at({ tries: 8, forger: 1, detective })).bunched).toBeGreaterThanOrEqual(
        ONE_FACE,
      );
    }
  }, 30_000);

  it("replays the same duel for a link", () => {
    const first = firstOf(at({ tries: 3 }), 5);
    expect(first).toHaveLength(5);
    expect(firstOf(at({ tries: 3 }), 5)).toEqual(first);
  });

  it("measures bunching as the share of points near their middle", () => {
    expect(bunching([0, 0, 0.01, 0, 0, 0.01, 0.9, 0.9])).toBe(0.75);
    expect(bunching([])).toBe(0);
  });

  it("draws real faces plainly, and faces off the ring as wrong", () => {
    expect(realLook(0).odd).toBe(0);
    expect(lookAt(0, 0.65).odd).toBeLessThan(0.5);
    expect(lookAt(0, 0).odd).toBe(1);
  });
});

describe("forger vs detective: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires once the forger's fakes all land in one place", () => {
    expect(mission.when(at({ tries: 8, forger: 1 }), eager)).toBe(true);
    expect(mission.when(at({}), steady)).toBe(false);
    expect(mission.when(at({ tries: 8 }), firstOf(at({ tries: 8 }), 2)[1])).toBe(false);
  });

  it("answers the eight-tries question from a finished duel with eight tries", () => {
    expect(guess.answer(at({ tries: 8, forger: 1 }), eager)).toBe("one");
    expect(guess.answer(at({}), steady)).toBeNull();
    expect(guess.answer(at({ tries: 8 }), undefined)).toBeNull();
  });
});

describe("forger vs detective: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { forger: 9, detective: -2, tries: 40, runs: -1 } as unknown as DuelState,
      initial,
    ) as DuelState;
    expect(safe).toEqual({ forger: 1, detective: 0, tries: 8, runs: 0 });
  });

  it("describes the duel before and after", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(isFinished(at({ tries: 8, forger: 1 }), eager)).toBe(true);
    expect(definition.describe?.(at({ tries: 8, forger: 1 }), eager)).toMatch(
      /same face every time/,
    );
  });
});

describe("forger vs detective: in the lesson", () => {
  it("shows the scoreboard once the duel runs", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    await waitFor(() => expect(document.querySelector("[data-fake]")).not.toBeNull(), {
      timeout: 10_000,
    });
    expect(screen.getByText(/The detective was right/)).toBeInTheDocument();
  });

  it("earns the star once the forger draws one face", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.tries.label }).focus();
    await userEvent.keyboard("{End}");
    screen.getByRole("slider", { name: words.forger.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 20_000,
    });
  }, 30_000);
});

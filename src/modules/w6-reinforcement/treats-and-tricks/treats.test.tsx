import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  BIG,
  favouriteOf,
  framesOf,
  learnedWrongTrick,
  MOST_OF_THE_TIME,
  MOST_ROUNDS,
  NO_TREAT_ROUNDS,
  trainerTreats,
  TRICKS,
  withDials,
  type TreatsFrame,
  type TreatsState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as TreatsState;
const at = (change: Partial<TreatsState>): TreatsState => ({ ...initial, ...change });
const newest = (state: TreatsState) => framesOf(state).at(-1) as TreatsFrame;
const SPIN = TRICKS.indexOf("spin");
const [mission] = missions;
const [guess] = predictions;

/** Trainer rounds (by tens) until the puppy spins most of the time, or null within 60. */
function roundsToSpin(puppy: number): number | null {
  let state = at({ puppy });
  while (state.treats.length < 60) {
    state = { ...state, treats: trainerTreats(state, "spin") };
    if (learnedWrongTrick(newest(state))) return state.treats.length;
  }
  return null;
}

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `treats-and-tricks-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("treats and tricks: the puppy", () => {
  it("starts with no favourite", () => {
    const frame = newest(initial);
    expect(frame.epoch).toBe(0);
    for (const share of frame.shares) expect(share).toBeCloseTo(0.25, 12);
  });

  it("learns to spin from a trainer who treats spins (measured over the first 50 puppies)", () => {
    // Measured: the first puppy spins most of the time after one trainer tap (ten rounds), and
    // every one of the first 50 does within two taps (twenty rounds).
    expect(roundsToSpin(0)).toBe(10);
    for (let puppy = 0; puppy < 50; puppy += 1) expect(roundsToSpin(puppy)).toBeLessThanOrEqual(20);
  });

  it("learns to sit from a trainer who treats sits", () => {
    const state = at({ treats: trainerTreats(initial, "sit", 30) });
    expect(favouriteOf(newest(state)).trick).toBe(0);
    expect(favouriteOf(newest(state)).share).toBeGreaterThanOrEqual(0.8);
  });

  it("keeps mixing every trick evenly when it never gets a treat", () => {
    for (const playful of [0, 0.5, 1]) {
      const state = at({ playful, treats: trainerTreats(at({ playful }), "none", 40) });
      expect(state.treats.every((treat) => treat === 0)).toBe(true);
      expect(favouriteOf(newest(state)).share).toBeCloseTo(0.25, 12);
    }
  });

  it("replays the same rounds for the same treats", () => {
    const treats = [1, 0, 0, 1, 1, 0, 1];
    expect(framesOf(at({ treats }))).toEqual(framesOf(at({ treats })));
    expect(framesOf(at({ treats, puppy: 1 }))).not.toEqual(framesOf(at({ treats })));
  });

  it("keeps earlier rounds when a dial turns, through the log", () => {
    const played = at({ treats: trainerTreats(initial, "spin") });
    const before = framesOf(played);
    const turned = { ...played, playful: 1, log: withDials(played) };
    expect(turned.log).toEqual([[10, BIG.start, initial.playful]]);
    const after = framesOf(turned);
    // Every finished round is the same; only the round it is on now changes how it picks.
    expect(after.slice(0, -1).map(({ trick, shares }) => [trick, shares])).toEqual(
      before.slice(0, -1).map(({ trick, shares }) => [trick, shares]),
    );
    // A second turn before another round keeps the log as it is.
    expect(withDials({ ...turned, playful: 0.2 })).toBe(turned.log);
  });

  it("stops at the most rounds a run keeps", () => {
    const full = at({ treats: new Array<number>(MOST_ROUNDS - 4).fill(0) });
    expect(trainerTreats(full, "sit")).toHaveLength(MOST_ROUNDS);
  });
});

describe("treats and tricks: mission and guess", () => {
  it("fires once a rewarded trick that isn't sit comes up most of the time", () => {
    const spun = at({ treats: trainerTreats(initial, "spin") });
    expect(mission.when(spun, newest(spun))).toBe(true);
    // Near misses: sitting learned, a frame from before, or a different run.
    const sat = at({ treats: trainerTreats(initial, "sit", 30) });
    expect(mission.when(sat, newest(sat))).toBe(false);
    expect(mission.when(spun, framesOf(spun)[3])).toBe(false);
    expect(mission.when({ ...spun, puppy: 1 }, newest(spun))).toBe(false);
    expect(MOST_OF_THE_TIME).toBe(0.5);
    expect(words.often(MOST_OF_THE_TIME)).toBe("most of the time");
    expect(words.often(MOST_OF_THE_TIME - 0.01)).not.toBe("most of the time");
  });

  it("answers the never-a-treat guess once ten rounds pass with no treat", () => {
    const nine = at({ treats: new Array<number>(NO_TREAT_ROUNDS - 1).fill(0) });
    expect(guess.answer(nine, newest(nine))).toBeNull();
    const ten = at({ treats: new Array<number>(NO_TREAT_ROUNDS).fill(0) });
    expect(guess.answer(ten, newest(ten))).toBe("mixes");
    const treated = at({ treats: [1, ...new Array<number>(NO_TREAT_ROUNDS).fill(0)] });
    expect(guess.answer(treated, newest(treated))).toBeNull();
  });
});

describe("treats and tricks: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      {
        treats: [1, 0, 2, "x", 1, ...new Array(300).fill(0)],
        big: 99,
        playful: -1,
        log: [
          [5, 9, 9],
          [3, 1, 0.5],
          [900, 0, 2],
          ["x", 1, 1],
        ],
        rule: "fetch",
        puppy: -4,
      } as unknown as TreatsState,
      initial,
    ) as TreatsState;
    expect(safe.treats).toHaveLength(MOST_ROUNDS);
    expect(safe.treats.slice(0, 3)).toEqual([1, 0, 1]);
    expect(safe.big).toBe(BIG.max);
    expect(safe.playful).toBe(0);
    expect(safe.log).toEqual([
      [5, BIG.max, 1],
      [MOST_ROUNDS, BIG.min, 1],
    ]);
    expect(safe.rule).toBe("sit");
    expect(safe.puppy).toBe(0);
  });

  it("describes the puppy's habit", () => {
    expect(definition.describe?.(initial, newest(initial))).toBe(
      "Zero rounds so far. The puppy mixes its four tricks evenly.",
    );
    const spun = at({ treats: trainerTreats(initial, "spin") });
    expect(definition.describe?.(spun, newest(spun))).toMatch(
      /^Ten rounds so far\. The puppy does “Spin”/,
    );
  });

  it("compares with a puppy treated only for sitting, over the same rounds", () => {
    const spun = at({ treats: trainerTreats(initial, "spin") });
    const other = definition.compare!(spun) as TreatsState;
    expect(other.treats).toHaveLength(spun.treats.length);
    expect(favouriteOf(newest(other)).trick).not.toBe(SPIN);
  });
});

describe("treats and tricks: in the lesson", () => {
  it("gives a treat and moves on to the next round", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.treat }));
    await waitFor(() =>
      expect(screen.getByTestId("treats-and-tricks")).toHaveAttribute("data-round", "1"),
    );
    expect(screen.getByText(/and got a treat/)).toBeInTheDocument();
  });

  it("earns the star when the trainer rewards spinning", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("radio", { name: words.trainer.rules.spin }));
    await userEvent.click(screen.getByRole("button", { name: words.trainer.play(10) }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 15_000);
});

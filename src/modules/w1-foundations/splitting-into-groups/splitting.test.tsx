import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words, predictionWords } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { fenceEnds, fenceRun, isFinished, plant, type SplitFrame, type SplitState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as SplitState;
const lastOf = (state: SplitState) => [...fenceRun(state)].at(-1) as SplitFrame;
const at = (change: Partial<SplitState>): SplitState => ({ ...initial, runs: 1, ...change });

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `splitting-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("splitting into groups: the fence", () => {
  it("finds a fence that splits two patches almost perfectly", () => {
    const state = at({});
    const end = lastOf(state);
    expect(isFinished(state, end)).toBe(true);
    expect(end.right / state.points.length).toBeGreaterThan(0.95);
    expect(end.loss).toBeLessThan([...fenceRun(state)][0]?.loss ?? 0);
  });

  it("is the same run every time, so a link replays it", () => {
    expect([...fenceRun(at({}))]).toEqual([...fenceRun(at({}))]);
  });

  it("knows a frame from other flowers or dials is not this fence", () => {
    const state = at({});
    const end = lastOf(state);
    expect(isFinished({ ...state, step: 0.9 }, end)).toBe(false);
    expect(isFinished({ ...state, points: state.points.slice(1) }, end)).toBe(false);
  });

  it("draws the fence where its score is zero, across the field", () => {
    const ends = fenceEnds([1, 0, 0]);
    expect(ends?.map(({ x }) => Math.abs(x))).toEqual([0, 0]);
    expect(fenceEnds([0, 0, 1])).toBeNull();
    expect(fenceEnds([1, 1, 5])).toBeNull();
  });
});

describe("splitting into groups: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when tulips ring the daisies, but not for two patches", () => {
    const ring = at({ garden: "ring", points: plant("ring") });
    expect(mission.when(ring, lastOf(ring))).toBe(true);
    const apart = at({});
    expect(mission.when(apart, lastOf(apart))).toBe(false);
  });

  it("does not fire on a fence that is still learning, or for a handful of flowers", () => {
    const ring = at({ garden: "ring", points: plant("ring") });
    const early = [...fenceRun(ring)][2];
    expect(mission.when(ring, early)).toBe(false);
    const few = at({ garden: "own", points: plant("ring").slice(0, 6) });
    expect(mission.when(few, lastOf(few))).toBe(false);
  });

  it("answers the ring question from a finished fence on the ring, and waits otherwise", () => {
    const ring = at({ garden: "ring", points: plant("ring") });
    expect(guess.answer(ring, lastOf(ring))).toBe("no");
    expect(guess.answer(at({}), lastOf(at({})))).toBeNull();
    expect(guess.answer(ring, undefined)).toBeNull();
  });
});

describe("splitting into groups: links and words", () => {
  it("keeps a hand-made link's numbers on their dials and its flowers in the field", () => {
    const parse = definition.parseState!;
    const saved = {
      ...initial,
      step: 9,
      practice: -3,
      runs: 1e9,
      brush: 7,
      lens: { x: 5, y: Number.NaN },
      points: [
        { x: 0.1, y: 0.2, label: 1 },
        { x: 4, y: 0, label: 0 },
        { x: 0, y: 0, label: 3 },
        ...Array.from({ length: 400 }, () => ({ x: 0, y: 0, label: 0 })),
      ],
    } as SplitState;
    const safe = parse(saved, initial) as SplitState;
    expect(safe.step).toBe(1);
    expect(safe.practice).toBe(0);
    expect(safe.runs).toBe(10_000);
    expect(safe.brush).toBe(2);
    expect(safe.lens).toEqual({ x: 1, y: 0 });
    expect(safe.points).toHaveLength(200);
    expect(safe.points[0]).toEqual({ x: 0.1, y: 0.2, label: 1 });
  });

  it("describes the field before and after a fence", () => {
    const state = at({});
    expect(definition.describe?.({ ...state, runs: 0 }, undefined)).toMatch(/no fence yet/);
    expect(definition.describe?.(state, lastOf(state))).toMatch(/on the right side/);
    expect(definition.describe?.({ ...state, points: [] }, undefined)).toBe(words.describe.empty);
  });
});

describe("splitting into groups: in the lesson", () => {
  it("puts up a fence when asked and says how many flowers it gets right", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.find }));
    await waitFor(
      () =>
        expect(document.querySelector("[data-right-side]")).toHaveTextContent(/on the right side/),
      { timeout: 5000 },
    );
    await waitFor(() => expect(document.querySelector("[data-fence]")).not.toBeNull(), {
      timeout: 5000,
    });
  });

  it("earns the star once the flowers are mixed so no straight fence works", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.gardens.ring }));
    await userEvent.click(screen.getByRole("button", { name: words.find }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
  });

  it("asks for both kinds of flowers before a fence can go up", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: words.gardens.own }));
    expect(screen.getByRole("button", { name: words.find })).toBeDisabled();
    expect(screen.getAllByText(words.needBoth).length).toBeGreaterThan(0);
  });

  it("offers the ring question with plain choices", () => {
    renderLesson();
    expect(screen.getByText(predictionWords.question)).toBeInTheDocument();
  });
});

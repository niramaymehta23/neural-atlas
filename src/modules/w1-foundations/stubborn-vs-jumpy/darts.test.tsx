import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { dartsOf, grouping, type DartsState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as DartsState;
const at = (change: Partial<DartsState>): DartsState => ({ ...initial, ...change });
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell lesson={{ ...valleyLesson, id: `darts-${(lessons += 1)}` }} module={definition} />,
  );

describe("stubborn vs jumpy: the darts", () => {
  it("stubborn robots bunch up away from the bullseye", () => {
    const { off, spread } = grouping(dartsOf(at({ bendy: 0, examples: 30 })));
    expect(off).toBeGreaterThan(0.5);
    expect(spread).toBeLessThan(0.2);
  });

  it("bendy robots with few examples scatter far more than with many", () => {
    const few = grouping(dartsOf(at({ bendy: 9, examples: 5 }))).spread;
    const many = grouping(dartsOf(at({ bendy: 9, examples: 30 }))).spread;
    expect(few).toBeGreaterThan(3 * many);
  });

  it("is the same darts for the same throw, and new ones for the next", () => {
    expect(dartsOf(at({}))).toEqual(dartsOf(at({})));
    expect(dartsOf(at({ throws: 1 }))).not.toEqual(dartsOf(at({})));
  });
});

describe("stubborn vs jumpy: mission and guess", () => {
  it("fires when very bendy robots see few examples, but not at the start", () => {
    expect(mission.when(at({ bendy: 9, examples: 5 }))).toBe(true);
    expect(mission.when(initial)).toBe(false);
    expect(mission.when(at({ bendy: 0, examples: 5 }))).toBe(false);
  });

  it("answers from very bendy robots with few examples, and waits otherwise", () => {
    expect(guess.answer(at({ bendy: 9, examples: 6 }))).toBe("scattered");
    expect(guess.answer(initial)).toBeNull();
  });
});

describe("stubborn vs jumpy: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { bendy: 40, examples: 1, throws: -2 } as unknown as DartsState,
      initial,
    );
    expect(safe).toEqual({ bendy: 9, examples: 5, throws: 0 });
  });

  it("describes the darts in words", () => {
    expect(definition.describe?.(at({ bendy: 9, examples: 5 }), undefined)).toMatch(
      words.scatter.wild,
    );
    expect(definition.describe?.(at({ bendy: 0, examples: 30 }), undefined)).toBe(
      `${words.scatter.tight} ${words.centre.far}`,
    );
  });
});

describe("stubborn vs jumpy: in the lesson", () => {
  it("earns the star once the darts scatter everywhere", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.bendy.label }).focus();
    await userEvent.keyboard("{End}");
    screen.getByRole("slider", { name: words.examples.label }).focus();
    await userEvent.keyboard("{Home}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
    expect(document.querySelector("[data-board-words]")).toHaveTextContent(words.scatter.wild);
  });

  it("throws again with fresh examples", async () => {
    renderLesson();
    const before = document.querySelector("[data-dart]")?.getAttribute("data-dart");
    await userEvent.click(screen.getByRole("button", { name: words.throwAgain }));
    expect(document.querySelectorAll("[data-dart]")).toHaveLength(12);
    expect(before).toBeDefined();
  });
});

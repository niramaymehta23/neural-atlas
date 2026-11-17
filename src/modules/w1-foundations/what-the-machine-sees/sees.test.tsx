import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { averageMiss, FACTS, fit, guesses, mostImportant, type SeesState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as SeesState;
const hide = (...facts: (typeof FACTS)[number][]): SeesState => ({
  ...initial,
  told: FACTS.map((fact) => !facts.includes(fact)),
  changes: 1,
});

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell lesson={{ ...valleyLesson, id: `sees-${(lessons += 1)}` }} module={definition} />,
  );

describe("what the machine sees: the guesser", () => {
  it("guesses new houses closely when told every fact", () => {
    expect(averageMiss(initial)).toBeLessThan(0.06);
  });

  it("gives a hidden fact no weight, and size the most", () => {
    expect(fit(hide("garden")).weights[2]).toBe(0);
    expect(mostImportant()).toBe("size");
  });

  it("finds that the door's colour hardly counts", () => {
    const { weights } = fit({ ...initial, jumpy: 0, houses: 1 });
    expect(Math.abs(weights[4] ?? 1)).toBeLessThan(0.1);
  });

  it("is the same guess every time", () => {
    expect(guesses(initial)).toEqual(guesses(initial));
  });
});

describe("what the machine sees: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when size is hidden, however much prices jump", () => {
    for (const jumpy of [0, 0.5, 1]) expect(mission.when({ ...hide("size"), jumpy })).toBe(true);
  });

  it("does not fire when other facts are hidden", () => {
    expect(mission.when(hide("rooms", "garden", "door"))).toBe(false);
    expect(mission.when(initial)).toBe(false);
  });

  it("answers size once a fact has been told or hidden", () => {
    expect(guess.answer(initial)).toBeNull();
    expect(guess.answer({ ...hide("door"), jumpy: 1 })).toBe("size");
  });
});

describe("what the machine sees: links and words", () => {
  it("keeps a hand-made link sane", () => {
    const safe = definition.parseState!(
      { told: [false, "yes", true], houses: 4, jumpy: -1, changes: -3 } as never,
      initial,
    ) as SeesState;
    expect(safe.told).toEqual([false, true, true, true, true]);
    expect(safe.houses).toBe(1);
    expect(safe.jumpy).toBe(0);
    expect(safe.changes).toBe(0);
  });

  it("says what it is told and how its guesses do", () => {
    expect(definition.describe?.(hide("door", "garden"), undefined)).toMatch(
      /^It is told size, rooms and distance to town\. Its guesses are/,
    );
    expect(definition.describe?.(hide(...FACTS), undefined)).toMatch(/told nothing/);
  });
});

describe("what the machine sees: in the lesson", () => {
  it("earns the star when size is hidden", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(
      screen.getByRole("button", { name: words.strings.voice(words.facts.size, true) }),
    );
    expect(
      screen.getByRole("button", { name: words.strings.voice(words.facts.size, false) }),
    ).toHaveAttribute("aria-pressed", "false");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
    expect(document.querySelector("[data-overall]")).toHaveAttribute("data-overall", "far");
  });
});

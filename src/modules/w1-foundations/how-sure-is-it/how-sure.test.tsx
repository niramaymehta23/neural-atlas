import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { predictionWords, words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  borderSureness,
  dotChances,
  dotsFor,
  guessOf,
  picksFor,
  sureAndWrong,
  UNSURE,
  type SureState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as SureState;
const at = (change: Partial<SureState>): SureState => ({ ...initial, ...change });

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `how-sure-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("how sure is it: the sorter", () => {
  it("is surer far from the fence than near it", () => {
    const state = at({});
    const chances = dotChances(state);
    const picks = picksFor(state.overlap);
    const sure = picks.map(
      (index) => guessOf(dotsFor(state.overlap)[index]!, chances[index]!, index).sure,
    );
    expect(sure[0]).toBeLessThan(sure.at(-1) ?? 0);
    expect(borderSureness(state.overlap)).toBeLessThan(UNSURE);
  });

  it("gets surer about every flower as it is allowed to boast", () => {
    const shy = dotChances(at({ boast: 0 }));
    const bold = dotChances(at({ boast: 1 }));
    shy.forEach((value, index) =>
      expect(Math.abs((bold[index] ?? 0.5) - 0.5)).toBeGreaterThanOrEqual(Math.abs(value - 0.5)),
    );
  });

  it("gives the same shading every time, so a link shows the same view", () => {
    expect(Array.from(dotChances(at({ overlap: 0.7 })))).toEqual(
      Array.from(dotChances(at({ overlap: 0.7 }))),
    );
  });
});

describe("how sure is it: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when a mixed-up sorter boasts, but not at the start", () => {
    expect(mission.when(at({ boast: 1, overlap: 1 }))).toBe(true);
    expect(mission.when(initial)).toBe(false);
    expect(sureAndWrong(at({ boast: 0, overlap: 1 }))).toBe(false);
  });

  it("answers the border question once the glass has been used", () => {
    expect(guess.answer(initial)).toBeNull();
    expect(guess.answer(at({ looked: true }))).toBe("unsure");
  });
});

describe("how sure is it: links and words", () => {
  it("keeps a hand-made link's numbers on their dials", () => {
    const saved = {
      boast: 7,
      overlap: Number.NaN,
      lens: { x: -9, y: "up" },
      looked: "yes",
    } as unknown as SureState;
    expect(definition.parseState!(saved, initial)).toEqual({
      boast: 1,
      overlap: 0,
      lens: { x: -1, y: 0 },
      looked: false,
    });
  });

  it("says what is in the glass, and when it is sure and wrong", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/Inside the glass/);
    expect(definition.describe?.(at({ boast: 1, overlap: 1 }), undefined)).toContain(
      words.certainWrong,
    );
  });
});

describe("how sure is it: in the lesson", () => {
  it("shows five flowers with how sure it is about each", () => {
    renderLesson();
    expect(screen.getAllByRole("meter")).toHaveLength(5);
    expect(screen.getByText(predictionWords.question)).toBeInTheDocument();
  });

  it("earns the star once the groups mix and it boasts", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    for (const label of [words.boast.label, words.overlap.label]) {
      const [dial] = screen.getAllByRole("slider", { name: label });
      dial!.focus();
      await userEvent.keyboard("{End}");
    }
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadWordPlaces } from "@/engine/language/files";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import type { WordPlaces } from "@/engine/language/word-places";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { WALKS, words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { frameOf, type PlacesFrame, type PlacesState } from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
let places: WordPlaces;
beforeAll(async () => {
  places = await loadWordPlaces();
}, 10_000);

const initial = definition.initialState as PlacesState;
const at = (change: Partial<PlacesState>): PlacesState => ({ ...initial, ...change });
const shown = (state: PlacesState): PlacesFrame => ({ ...frameOf(places, state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("words as places: the walk", () => {
  it("lands nearest queen from king, away from man, toward woman", () => {
    expect(shown(at({ amount: 1 })).landing[0]?.word).toBe("queen");
  });

  it("lands back on king when the start words are kept", () => {
    expect(shown(at({ amount: 1, skip: false })).landing[0]?.word).toBe("king");
  });

  it("finds Rome from Paris, away from France, toward Italy", () => {
    const [from, minus, plus] = WALKS.cities;
    expect(shown(at({ from, minus, plus, amount: 1 })).landing[0]?.word).toBe("rome");
  });

  it("says when a word is not on the map", () => {
    expect(shown(at({ from: "zzzq" })).known).toBe(false);
  });
});

describe("words as places: mission and guess", () => {
  it("fires when the whole arrow lands back on a start word", () => {
    const state = at({ amount: 1, skip: false });
    expect(mission.when(state, shown(state))).toBe(true);
  });

  it("does not fire with the start words skipped, short of the arrow, or on an old frame", () => {
    const skipped = at({ amount: 1 });
    expect(mission.when(skipped, shown(skipped))).toBe(false);
    const short = at({ amount: 0, skip: false });
    expect(mission.when(short, shown(short))).toBe(false);
    expect(mission.when(at({ amount: 1, skip: false }), shown(skipped))).toBe(false);
  });

  it("answers queen only once the famous walk is on screen", () => {
    expect(guess.answer(initial, shown(initial))).toBeNull();
    expect(guess.answer(initial, shown(at({ amount: 1 })))).toBe("queen");
    expect(guess.answer(initial, shown(at({ amount: 1, skip: false })))).toBeNull();
  });
});

describe("words as places: links and words", () => {
  it("keeps a hand-made link to small words and the dial's range", () => {
    const safe = definition.parseState!(
      {
        from: "KING!!" + "x".repeat(40),
        minus: "m4n",
        plus: "",
        amount: 9,
        skip: false,
        shown: 50,
      },
      initial,
    ) as PlacesState;
    expect(safe).toEqual({
      from: "kingxxxxxxxxxxxxxxxx",
      minus: "mn",
      plus: "",
      amount: 1.5,
      skip: false,
      shown: 8,
    });
  });

  it("describes where the walk lands", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(initial, shown(at({ amount: 1 })))).toMatch(/nearest queen/);
  });
});

describe("words as places: in the lesson", () => {
  it("walks to queen, then earns the star by keeping the start words", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "words-as-places-1" }} module={definition} />,
    );
    await waitFor(() => expect(document.querySelector("[data-landing]")).not.toBeNull(), {
      timeout: 10_000,
    });
    await userEvent.click(screen.getByRole("switch", { name: words.skip }));
    // Twenty notches of the dial: the whole arrow.
    const dial = screen.getByRole("slider", { name: words.amount.label });
    dial.focus();
    await userEvent.keyboard("{ArrowRight>20/}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(document.querySelector("[data-landing] li")?.getAttribute("data-word")).toBe("king");
  }, 20_000);
});

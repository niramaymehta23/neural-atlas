import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadWordPlaces } from "@/engine/language/files";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import type { WordPlaces } from "@/engine/language/word-places";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { LIBRARY, QUESTIONS, words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { frameOf, listedOf, type LookFrame, type LookState } from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
let places: WordPlaces;
beforeAll(async () => {
  places = await loadWordPlaces();
}, 10_000);

const initial = definition.initialState as LookState;
const at = (change: Partial<LookState>): LookState => ({ ...initial, ...change }) as LookState;
const shown = (state: LookState): LookFrame => ({ ...frameOf(places, state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("looking things up: the librarian", () => {
  it("finds the right book, and the right page, for every ready-made question", () => {
    for (const { ask, book } of QUESTIONS) {
      const frame = shown(at({ question: ask }));
      expect(frame.used).toBe(book);
      expect(LIBRARY[book]?.pages).toContain(frame.answer);
    }
  });

  it("answers from whatever book it is handed", () => {
    const frame = shown(at({ handed: 5 }));
    expect(LIBRARY[5].pages).toContain(frame.answer);
  });

  it("answers from memory without looking up", () => {
    expect(shown(at({ lookUp: false })).used).toBe(-1);
  });

  it("says it can't answer when the book it is handed matches too poorly", () => {
    const right = shown(initial);
    const best = right.ranking[0]?.likeness ?? 0;
    const need = best - 0.01;
    expect(shown(at({ need })).refused).toBe(false);
    expect(shown(at({ need })).answer).not.toBe("");
    const wrong = shown(at({ need, handed: 5 }));
    expect(wrong.refused).toBe(true);
    expect(wrong.answer).toBe("");
    expect(mission.when(at({ need, handed: 5 }), wrong)).toBe(false);
  });

  it("lists only the best books, plus the one in use", () => {
    const frame = shown(at({ listed: 1, handed: 5 }));
    expect(listedOf(frame).map(({ book }) => book)).toEqual([frame.ranking[0]?.book, 5]);
  });
});

describe("looking things up: mission and guess", () => {
  it("fires when a ready-made question is handed the wrong book", () => {
    const state = at({ handed: 5 });
    expect(mission.when(state, shown(state))).toBe(true);
    expect(guess.answer(state, shown(state))).toBe("anyway");
    expect(mission.when(initial, shown(initial))).toBe(false);
    expect(guess.answer(initial, shown(initial))).toBeNull();
  });
});

describe("looking things up: links", () => {
  it("keeps a hand-made link to a real book", () => {
    expect(
      definition.parseState!(
        { question: "x".repeat(200), handed: 40, lookUp: true, need: 4, listed: 0 },
        initial,
      ),
    ).toEqual({
      question: "x".repeat(80),
      handed: -1,
      lookUp: true,
      need: 0.95,
      listed: 1,
    });
  });
});

describe("looking things up: in the lesson", () => {
  it("earns the star by handing over the wrong book", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "looking-things-up-1" }} module={definition} />,
    );
    await waitFor(() => expect(document.querySelector("[data-answer]")).not.toBeNull(), {
      timeout: 10_000,
    });
    await userEvent.click(screen.getByRole("button", { name: words.hand(LIBRARY[2].title) }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 20_000);
});

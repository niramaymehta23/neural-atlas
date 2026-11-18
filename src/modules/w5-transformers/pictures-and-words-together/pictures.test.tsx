import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadMatcher, loadWordPlaces } from "@/engine/language/files";
import type { Matcher } from "@/engine/language/picture-words";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import type { WordPlaces } from "@/engine/language/word-places";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { CAPTIONS, PHOTOS, words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { EMPTY, frameOf, place, type PicturesFrame, type PicturesState } from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
let matcher: Matcher;
let places: WordPlaces;
beforeAll(async () => {
  [matcher, places] = await Promise.all([loadMatcher(), loadWordPlaces()]);
}, 10_000);

const initial = definition.initialState as PicturesState;
const with_ = (caption: string, kind: string, threshold = initial.threshold): PicturesState => ({
  placed: place(
    EMPTY,
    PHOTOS.findIndex((photo) => photo.kind === kind),
    CAPTIONS.findIndex(({ text }) => text === caption),
  ),
  threshold,
  holding: -1,
});
const shown = (state: PicturesState): PicturesFrame => ({
  ...frameOf(matcher, places, state),
  epoch: 1,
});
const [mission] = missions;
const [guess] = predictions;

describe("pictures and words together: the matcher", () => {
  it("calls every right caption a match on its own photo", () => {
    CAPTIONS.slice(0, 6).forEach(({ text, kind }) => {
      const frame = shown(with_(text, kind));
      expect(frame.placements[0]?.match).toBe(true);
      expect(frame.placements[0]?.right).toBe(true);
    });
  });

  it("does not call a wolf a dog at the starting dial", () => {
    expect(shown(with_("a wolf", "dog")).placements[0]?.match).toBe(false);
  });
});

describe("pictures and words together: mission and guess", () => {
  it("is fooled by a car on the bicycle, unless it is strict", () => {
    const state = with_("a car", "bicycle");
    expect(mission.when(state, shown(state))).toBe(true);
    expect(guess.answer(state, shown(state))).toBe("yes");
    const strict = with_("a car", "bicycle", 0.85);
    expect(mission.when(strict, shown(strict))).toBe(false);
    expect(guess.answer(strict, shown(strict))).toBe("no");
    expect(mission.when(initial, shown(initial))).toBe(false);
  });
});

describe("pictures and words together: links", () => {
  it("keeps each caption on one photo and the dial in range", () => {
    const safe = definition.parseState!(
      { placed: [8, 8, 99, -7, "x", 2, 4], threshold: 3, holding: 4 } as unknown as PicturesState,
      initial,
    );
    expect(safe).toEqual({ placed: [8, -1, -1, -1, -1, 2], threshold: 0.95, holding: -1 });
  });
});

describe("pictures and words together: in the lesson", () => {
  it("places a caption by tapping and earns the star", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "pictures-and-words-1" }} module={definition} />,
    );
    await waitFor(() => expect(document.querySelector("[data-photos]")).not.toBeNull(), {
      timeout: 10_000,
    });
    await userEvent.click(screen.getByRole("button", { name: words.pickUp("a car") }));
    await userEvent.click(
      screen.getByRole("button", { name: words.placeOn("An old bicycle", "a car") }),
    );
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 20_000);
});

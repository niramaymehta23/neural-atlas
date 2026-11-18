import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SIDE } from "@/engine/vision/seeing";
import { fakeVisionReader } from "@/engine/vision/testing/fake-vision";
import { samplePhoto } from "@/engine/vision/testing/node-vision";
import { setVisionReader } from "@/engine/vision/vision-client";
import { setPhotoReader } from "@/features/inside/use-photo";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { blowUp, frameFor, lastKnownOf, pool, toBytes, type ZoomState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as ZoomState;
const dog = samplePhoto("dog");

/** How much fine detail a picture has: the mean change from each dot to the next along a row. */
function detail(pixels: Uint8ClampedArray): number {
  let sum = 0;
  for (let at = 4; at < pixels.length; at += 4)
    sum += Math.abs((pixels[at] ?? 0) - (pixels[at - 4] ?? 0));
  return sum / (pixels.length / 4);
}
const shown = (tile: number) => blowUp(pool(dog, tile, "average"), SIDE / tile);
// Like the real model on the dog: it knows the photo shrunk once, and loses track after that.
const ENOUGH = (detail(shown(2)) + detail(shown(4))) / 2;

const reader = fakeVisionReader({
  see: ({ pixels }) => ({
    answers: [
      detail(pixels) > ENOUGH
        ? { thing: 242, name: "boxer", share: 0.9 }
        : { thing: 677, name: "nail", share: 0.4 },
    ],
  }),
});

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `zooming-out-${(lessons += 1)}` }}
      module={definition}
    />,
  );

beforeAll(() => {
  setPhotoReader(async () => samplePhoto("dog"));
  setVisionReader(reader);
});
afterAll(() => {
  setPhotoReader(null);
  setVisionReader(null);
});

describe("zooming out: shrinking", () => {
  const picture = new Uint8ClampedArray(SIDE * SIDE * 4);
  // Left half dark, right half light, with one bright dot in the top-left tile.
  for (let spot = 0; spot < SIDE * SIDE; spot += 1) {
    const value = spot % SIDE < SIDE / 2 ? 20 : 220;
    picture.set([value, value, value, 255], spot * 4);
  }
  picture.set([200, 200, 200, 255], 0);

  it("keeps the average or the brightest of each tile", () => {
    const average = pool(picture, 112, "average");
    const brightest = pool(picture, 112, "brightest");
    expect(average[0]).toBeCloseTo(20 + 180 / (112 * 112));
    expect(brightest[0]).toBe(200);
    expect(average[3]).toBeCloseTo(220);
    expect(Array.from(toBytes(brightest, 2).subarray(0, 8))).toEqual([
      200, 200, 200, 255, 220, 220, 220, 255,
    ]);
  });

  it("gives back the photo itself when not shrunk", () => {
    expect(blowUp(pool(dog, 1, "average"), SIDE)).toEqual(dog);
  });

  it("finds the last shrink before the answer changes", () => {
    expect(lastKnownOf(["boxer", "boxer", "nail", "boxer"])).toBe(1);
    expect(lastKnownOf(["boxer", "nail"])).toBe(0);
  });
});

describe("zooming out: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;
  const names = ["boxer", "boxer", "nail", "nail", "nail", "nail", "nail", "nail"];

  it("fires at the last shrink the AI still knows, and not before or after", () => {
    for (const [shrink, fires] of [
      [0, false],
      [1, true],
      [2, false],
    ] as const) {
      const state = { ...initial, shrink };
      expect(mission.when(state, frameFor(state, names, 1))).toBe(fires);
    }
    const other = { ...initial, shrink: 1, keep: "brightest" as const };
    expect(mission.when(other, frameFor(initial, names, 1))).toBe(false);
  });

  it("is answered at a few blocks across, from the AI's own answers", () => {
    const few = { ...initial, shrink: 5 };
    expect(guess.answer(few, frameFor(few, names, 1))).toBe("loses");
    expect(guess.answer(few, frameFor(few, Array(8).fill("boxer") as string[], 1))).toBe("keeps");
    expect(guess.answer(initial, frameFor(initial, names, 1))).toBeNull();
  });
});

describe("zooming out: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { photo: "moon", shrink: 99, keep: "most" } as unknown as ZoomState,
      initial,
    );
    expect(safe).toEqual({ photo: "dog", shrink: 7, keep: "average" });
  });

  it("describes the shrink", () => {
    expect(definition.describe?.(initial, undefined)).toBe(
      words.describe(words.photos.names.dog, words.shrink.names[0]!, "the average"),
    );
  });
});

describe("zooming out: in the lesson", () => {
  it("fills in the ladder, tells when the AI loses track, and earns the star", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await waitFor(() => expect(screen.getByText(words.says("boxer"))).toBeInTheDocument());
    const dial = screen.getByRole("slider", { name: words.shrink.label });
    dial.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await waitFor(() => expect(screen.getByText(words.lost("nail", "boxer"))).toBeInTheDocument());
    await waitFor(() =>
      expect(document.querySelector("[data-ladder]")?.getAttribute("data-ladder")).toBe("8"),
    );
    await userEvent.keyboard("{ArrowLeft}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readWeights, type FacesManifest } from "@/engine/generative/faces";
import { failFaceFiles, readFacesFromDisk } from "@/features/generative/testing/disk";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  brushOver,
  fogRun,
  isFinished,
  isMush,
  steerOf,
  type FogFrame,
  type FogState,
} from "./model";
import { predictions } from "./predictions";
import { dab } from "./scene";

const folder = join(process.cwd(), "public", "models", "faces-v1");
const manifest = JSON.parse(readFileSync(join(folder, "manifest.json"), "utf8")) as FacesManifest;
const bytes = readFileSync(join(folder, "fog.bin"));
const weights = readWeights(
  manifest.models.fog,
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
const initial = definition.initialState as FogState;
const at = (change: Partial<FogState>): FogState => ({ ...initial, runs: 1, ...change });
const runOf = (state: FogState) => [...fogRun(weights, manifest.models.fog, state)];
const lastOf = (state: FogState) => runOf(state).at(-1) as FogFrame;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `painting-from-fog-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("painting from fog: clearing", () => {
  it("finds a crisp face with enough steps from every fog, and mush in one or two", () => {
    for (let fog = 1; fog <= 20; fog += 1) {
      expect(isMush(lastOf(at({ fog })))).toBe(false);
      expect(isMush(lastOf(at({ fog, cleanings: 1 })))).toBe(true);
      expect(isMush(lastOf(at({ fog, cleanings: 2 })))).toBe(true);
    }
  });

  it("is the same clearing every time, so a link replays it", () => {
    const painted = at({ paint: brushOver([], dab(10, 10), "ink") });
    expect(runOf(painted)).toEqual(runOf(painted));
  });

  it("records one moment per step, fog first", () => {
    const moments = runOf(at({ cleanings: 7 }));
    expect(moments).toHaveLength(8);
    expect(moments[0]?.loss).toBe(1);
    expect(isFinished(at({ cleanings: 7 }), moments.at(-1))).toBe(true);
  });
});

describe("painting from fog: paint", () => {
  it("paints, repaints and rubs out a dab, one entry per pixel", () => {
    const inked = brushOver([], dab(0, 0), "ink");
    expect(inked).toEqual(["0:1", "1:1", "32:1"]);
    expect(brushOver(inked, [1], "paper")).toEqual(["0:1", "1:0", "32:1"]);
    expect(brushOver(inked, [0, 1, 32], "rub")).toEqual([]);
  });

  it("keeps the painted pixels in the final picture", () => {
    const paint = brushOver(brushOver([], dab(16, 4), "ink"), dab(16, 28), "paper");
    const end = lastOf(at({ paint }));
    for (const [pixel, ink] of steerOf(paint)) expect(end.picture[pixel]).toBe(ink);
  });
});

describe("painting from fog: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires on a finished few-step clearing that is mush, not on a crisp one", () => {
    const few = at({ cleanings: 1 });
    expect(mission.when(few, lastOf(few))).toBe(true);
    expect(mission.when(at({}), lastOf(at({})))).toBe(false);
    expect(mission.when(few, runOf(few)[0])).toBe(false);
  });

  it("answers the one-step question from a finished one-step clearing only", () => {
    const one = at({ cleanings: 1 });
    expect(guess.answer(one, lastOf(one))).toBe("mush");
    expect(guess.answer(at({}), lastOf(at({})))).toBeNull();
  });
});

describe("painting from fog: links and words", () => {
  it("keeps a hand-made link on its dials, with only real paint", () => {
    const safe = definition.parseState!(
      {
        cleanings: 900,
        fog: -1,
        paint: ["5:1", "5:0", "2000:1", "x", 7, "3:1"],
        brush: "spray",
        runs: -2,
      } as unknown as FogState,
      initial,
    );
    expect(safe).toEqual({ cleanings: 50, fog: 1, paint: ["3:1", "5:0"], brush: "ink", runs: 0 });
  });

  it("describes the clearing before and after", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/waiting to be cleared/);
    const one = at({ cleanings: 1 });
    expect(definition.describe?.(one, lastOf(one))).toMatch(/Grey mush/);
  });
});

describe("painting from fog: in the lesson", () => {
  beforeEach(readFacesFromDisk);

  it("clears the fog into a face, then earns the star with one giant step", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await userEvent.click(await within(dock).findByRole("button", { name: words.clear }));
    await waitFor(
      () =>
        expect(document.querySelector("[data-verdict]")?.getAttribute("data-verdict")).toBe("face"),
      { timeout: 5000 },
    );
    screen.getByRole("slider", { name: words.cleanings.label }).focus();
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
    // Long enough for both waits above: the clearing, then the star.
  }, 15_000);

  it("paints from the keyboard", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    const picture = await screen.findByRole("group", { name: words.picture.label });
    picture.focus();
    await userEvent.keyboard("{ArrowUp}{Enter}");
    expect(picture.getAttribute("data-painted")).toBe("5");
  });

  it("says plainly when the fog cleaner cannot be fetched", async () => {
    failFaceFiles();
    renderLesson();
    expect(await screen.findByText(words.model.failed)).toBeInTheDocument();
  });
});

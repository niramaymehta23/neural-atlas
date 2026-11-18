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
  ALMOST,
  closenessOf,
  frameOf,
  squeezeOf,
  type SqueezeFrame,
  type SqueezeState,
} from "./model";
import { predictions } from "./predictions";

const folder = join(process.cwd(), "public", "models", "faces-v1");
const manifest = JSON.parse(readFileSync(join(folder, "manifest.json"), "utf8")) as FacesManifest;
const faces = new Uint8Array(readFileSync(join(folder, "faces.bin")));
const bytes = readFileSync(join(folder, "squeeze.bin"));
const weights = readWeights(
  manifest.models.squeeze,
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
const initial = definition.initialState as SqueezeState;
const at = (change: Partial<SqueezeState>): SqueezeState => ({ ...initial, ...change });
const frameAt = (state: SqueezeState): SqueezeFrame =>
  frameOf(weights, faces, state, squeezeOf(weights, faces, state).rebuilt, 1);

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `squeeze-and-rebuild-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("squeeze and rebuild: the squeeze", () => {
  it("rebuilds every face almost exactly from all sixteen numbers, and blurs it from one", () => {
    for (let face = 0; face < 12; face += 1) {
      expect(closenessOf(frameAt(at({ face })).gap)).toBe("almost");
      expect(frameAt(at({ face, keep: 1 })).gap).toBeGreaterThan(ALMOST * 4);
    }
  });

  it("cleans speckles away for every face", () => {
    for (let face = 0; face < 12; face += 1) {
      expect(frameAt(at({ face, smudge: 1 })).cleansSpeckles).toBe(true);
    }
  });

  it("speckles the same way every time, so a link shows the same picture", () => {
    const state = at({ face: 3, smudge: 0.6 });
    expect(squeezeOf(weights, faces, state).input).toEqual(squeezeOf(weights, faces, state).input);
  });
});

describe("squeeze and rebuild: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires only once the face on screen is squeezed to one number", () => {
    expect(mission.when(at({ keep: 1 }), frameAt(at({ keep: 1 })))).toBe(true);
    expect(mission.when(at({ keep: 2 }), frameAt(at({ keep: 2 })))).toBe(false);
    expect(mission.when(at({ keep: 1 }), frameAt(at({ keep: 3 })))).toBe(false);
    expect(mission.when(at({ keep: 1 }), undefined)).toBe(false);
  });

  it("answers the speckle question only after real speckling, the same at any squeeze", () => {
    expect(guess.answer(initial, frameAt(initial))).toBeNull();
    expect(guess.answer(at({ smudge: 0.6 }), frameAt(at({ smudge: 0.6 })))).toBe("clean");
    expect(guess.answer(at({ smudge: 0.6, keep: 2 }), frameAt(at({ smudge: 0.6, keep: 2 })))).toBe(
      "clean",
    );
  });
});

describe("squeeze and rebuild: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { face: 99, keep: -4, smudge: 3.33333 } as unknown as SqueezeState,
      initial,
    );
    expect(safe).toEqual({ face: 11, keep: 1, smudge: 1 });
  });

  it("describes the squeeze in words", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.loading);
    const one = at({ keep: 1 });
    expect(definition.describe?.(one, frameAt(one))).toMatch(/^Squeezed down to just one number/);
  });
});

/** Reading and running the 3.2 MB squeezer the first time; a slower CI runner needs well over a second. */
const LOAD = { timeout: 10_000 };

describe("squeeze and rebuild: in the lesson", () => {
  beforeEach(readFacesFromDisk);

  it("rebuilds the face, then earns the star once squeezed to one number", async () => {
    renderLesson();
    await waitFor(() => expect(document.querySelector("[data-closeness]")).not.toBeNull(), LOAD);
    expect(document.querySelector("[data-closeness]")?.getAttribute("data-closeness")).toBe(
      "almost",
    );
    screen.getByRole("slider", { name: words.keep.label }).focus();
    await userEvent.keyboard("{Home}");
    await waitFor(
      () =>
        expect(document.querySelector("[data-closeness]")?.getAttribute("data-closeness")).toBe(
          "blurry",
        ),
      LOAD,
    );
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(
      () => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(),
      LOAD,
    );
  }, 30_000);

  it("picks another face from the keyboard", async () => {
    renderLesson();
    const first = await screen.findByRole("radio", { name: words.faces.face(1) });
    first.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: words.faces.face(2) })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("says plainly when the squeezer cannot be fetched, and tries again", async () => {
    failFaceFiles();
    renderLesson();
    expect(await screen.findByText(words.model.failed, {}, LOAD)).toBeInTheDocument();
    readFacesFromDisk();
    await userEvent.click(screen.getByRole("button", { name: words.model.retry }));
    await waitFor(() => expect(document.querySelector("[data-closeness]")).not.toBeNull(), LOAD);
  }, 30_000);
});

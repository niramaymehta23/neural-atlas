import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pictureAt, readWeights, type FacesManifest } from "@/engine/generative/faces";
import { failFaceFiles, readFacesFromDisk } from "@/features/generative/testing/disk";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  CHECK,
  isNonsense,
  mapName,
  spotAt,
  tileAt,
  windowFor,
  type MapFrame,
  type MapState,
} from "./model";
import { predictions } from "./predictions";

const folder = join(process.cwd(), "public", "models", "faces-v1");
const manifest = JSON.parse(readFileSync(join(folder, "manifest.json"), "utf8")) as FacesManifest;
const faces = new Uint8Array(readFileSync(join(folder, "faces.bin")));
const weightsOf = (tidy: number) => {
  const entry = manifest.models[mapName(tidy)];
  const bytes = readFileSync(join(folder, entry.file));
  return readWeights(
    entry,
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
};
const initial = definition.initialState as MapState;
const at = (change: Partial<MapState>): MapState => ({ ...initial, ...change });
const nonsenseAt = (state: MapState) =>
  isNonsense(
    pictureAt(weightsOf(state.tidy), ...spotAt(windowFor(manifest, state.tidy), state.x, state.y)),
    faces,
  );
const frameAt = (state: MapState, torn: number | null = null): MapFrame => ({
  epoch: 1,
  loss: 0,
  tidy: state.tidy,
  x: state.x,
  y: state.y,
  nonsense: nonsenseAt(state),
  torn,
});
/** A torn spot of the untidy map: the bottom-left corner, where no real faces landed. */
const torn = at({ tidy: 0, x: 0.04, y: 0.96 });
const tornCount = (tidy: number) => {
  const weights = weightsOf(tidy);
  const view = windowFor(manifest, tidy);
  let bad = 0;
  for (let index = 0; index < CHECK * CHECK; index += 1)
    if (isNonsense(tileAt(weights, view, CHECK, index % CHECK, Math.floor(index / CHECK)), faces))
      bad += 1;
  return bad;
};

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `smooth-imagination-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("smooth imagination: the maps", () => {
  it("leaves far more nonsense in the untidy map than in the tidy ones", () => {
    const counts = [0, 1, 2].map(tornCount);
    expect(counts[0]).toBeGreaterThanOrEqual(15);
    expect(counts[2]).toBeLessThanOrEqual(3);
    expect(counts[0]).toBeGreaterThan((counts[1] ?? 0) * 2);
  });

  it("draws a face in the middle of every map, and nonsense in the untidy map's torn corner", () => {
    for (const tidy of [0, 1, 2]) expect(nonsenseAt(at({ tidy }))).toBe(false);
    expect(nonsenseAt(torn)).toBe(true);
    expect(nonsenseAt({ ...torn, tidy: 2 })).toBe(false);
    expect(nonsenseAt(at({ tidy: 0, x: 0, y: 1 }))).toBe(true);
  });
});

describe("smooth imagination: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires on nonsense in the untidy map only", () => {
    expect(mission.when(torn, frameAt(torn))).toBe(true);
    expect(mission.when(at({ tidy: 0 }), frameAt(at({ tidy: 0 })))).toBe(false);
    expect(mission.when({ ...torn, x: 0.5 }, frameAt(torn))).toBe(false);
  });

  it("answers from the fixed check of the untidy map, whatever the marker shows", () => {
    expect(guess.answer(initial, frameAt(initial, 2))).toBeNull();
    expect(guess.answer(at({ tidy: 0 }), frameAt(at({ tidy: 0 }), null))).toBeNull();
    expect(guess.answer(at({ tidy: 0 }), frameAt(at({ tidy: 0 }), tornCount(0)))).toBe("no");
  });
});

describe("smooth imagination: links and words", () => {
  it("keeps a hand-made link on the map and its dials", () => {
    const safe = definition.parseState!(
      { tidy: 7, across: 99, x: -2, y: 0.12345 } as unknown as MapState,
      initial,
    );
    expect(safe).toEqual({ tidy: 2, across: 12, x: 0, y: 0.123 });
  });

  it("describes the spot under the marker", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.loading);
    expect(definition.describe?.(torn, frameAt(torn))).toMatch(/nonsense/);
  });
});

describe("smooth imagination: in the lesson", () => {
  beforeEach(readFacesFromDisk);

  it("moves the marker with the arrow keys and earns the star in a torn corner", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    const map = await screen.findByRole("group", { name: words.map.label });
    await waitFor(() =>
      expect(document.querySelector("[data-nonsense]")?.getAttribute("data-nonsense")).toBe(
        "false",
      ),
    );
    screen.getByRole("slider", { name: words.tidy.label }).focus();
    await userEvent.keyboard("{Home}");
    await waitFor(() =>
      expect(document.querySelector("[data-arriving]")?.getAttribute("data-arriving")).toBe(
        "false",
      ),
    );
    map.focus();
    for (let press = 0; press < 20; press += 1) {
      await userEvent.keyboard("{ArrowLeft}{ArrowDown}");
    }
    await waitFor(() =>
      expect(document.querySelector("[data-nonsense]")?.getAttribute("data-nonsense")).toBe("true"),
    );
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });

  it("says plainly when the map cannot be fetched", async () => {
    failFaceFiles();
    renderLesson();
    expect(await screen.findByText(words.model.failed)).toBeInTheDocument();
  });
});

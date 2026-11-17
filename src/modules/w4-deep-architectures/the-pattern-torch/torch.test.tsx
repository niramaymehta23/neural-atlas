import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { samplePhoto } from "@/engine/vision/testing/node-vision";
import { setPhotoReader } from "@/features/inside/use-photo";
import { companionStore } from "@/platform/companion/companion";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  findings,
  frameFor,
  greyOf,
  scores,
  TORCHES,
  whereEdgeTorchLights,
  type Cell,
  type TorchState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as TorchState;
const CHECKER: Cell[] = [1, -1, 1, -1, 1, -1, 1, -1, 1];
const PHOTOS = ["cat", "dog", "teapot"] as const;
const greys = Object.fromEntries(PHOTOS.map((name) => [name, greyOf(samplePhoto(name))]));
const frame = (state: TorchState) => frameFor(state, greys[state.photo]!, 1);

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `the-pattern-torch-${(lessons += 1)}` }}
      module={definition}
    />,
  );

beforeAll(() => setPhotoReader(async (name) => samplePhoto(name as (typeof PHOTOS)[number])));
afterAll(() => setPhotoReader(null));

describe("the pattern torch: what it finds", () => {
  it("lights up the up-and-down edge torch along edges in every sample photo", () => {
    for (const name of PHOTOS) expect(whereEdgeTorchLights(greys[name]!)).toBe("edges");
  });

  it("finds nothing with an empty torch, and something with every preset on the cat", () => {
    const grey = greys.cat!;
    expect(Math.max(...scores(grey, TORCHES.blank))).toBe(0);
    for (const torch of [TORCHES.upDown, TORCHES.sideways, TORCHES.spot]) {
      expect(Math.max(...findings(scores(grey, torch), 0.2))).toBeGreaterThan(0.1);
    }
  });

  it("finds nothing with light and dark taking turns on the cat and dog, but does on the patterned teapot", () => {
    for (const name of ["cat", "dog"] as const) {
      expect(Math.max(...findings(scores(greys[name]!, CHECKER), 0.2))).toBeLessThanOrEqual(0.02);
    }
    expect(Math.max(...findings(scores(greys.teapot!, CHECKER), 0.2))).toBeGreaterThan(0.1);
  });
});

describe("the pattern torch: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when a whole sweep with a gentle cut-off finds nothing", () => {
    const state = { ...initial, torch: CHECKER, sweep: 1 };
    expect(mission.when(state, frame(state))).toBe(true);
  });

  it("does not fire part-way, with a strict cut-off doing the work, or when something is found", () => {
    const part = { ...initial, torch: CHECKER, sweep: 0.5 };
    expect(mission.when(part, frame(part))).toBe(false);
    const strict = { ...initial, photo: "dog" as const, sweep: 1, strict: 0.6 };
    expect(frame(strict).strongest).toBe(0);
    expect(mission.when(strict, frame(strict))).toBe(false);
    const found = { ...initial, sweep: 1 };
    expect(mission.when(found, frame(found))).toBe(false);
  });

  it("is answered by a full sweep of the edge torch, from the photo itself", () => {
    const swept = { ...initial, sweep: 1 };
    expect(guess.answer(swept, frame(swept))).toBe("edges");
    expect(guess.answer(initial, frame(initial))).toBeNull();
    const other = { ...initial, torch: [...TORCHES.spot], sweep: 1 };
    expect(guess.answer(other, frame(other))).toBeNull();
  });
});

describe("the pattern torch: links and words", () => {
  it("keeps a hand-made link on its dials and squares", () => {
    const safe = definition.parseState!(
      { photo: "moon", torch: [5, -1, "x", 1], sweep: 9, strict: -2 } as unknown as TorchState,
      initial,
    ) as TorchState;
    expect(safe).toEqual({
      photo: "cat",
      torch: [0, -1, 0, 1, 0, 0, 0, 0, 0],
      sweep: 1,
      strict: 0,
    });
  });

  it("describes the torch", () => {
    expect(definition.describe?.(initial, undefined)).toBe(
      words.describe(words.presets.names.upDown, words.found.waiting),
    );
  });
});

describe("the pattern torch: in the lesson", () => {
  it("changes a square on tap, sweeps, gives the companion a torch and earns the star", async () => {
    companionStore.reset();
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await waitFor(() => expect(screen.getByText(words.found.waiting)).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: words.presets.names.blank }));
    await userEvent.click(screen.getByRole("button", { name: words.torch.cell(4, 0) }));
    expect(screen.getByRole("button", { name: words.torch.cell(4, 1) })).toBeInTheDocument();
    for (const [place, cell] of CHECKER.entries()) {
      if (place === 4) continue;
      const button = screen.getByRole("button", { name: words.torch.cell(place, 0) });
      await userEvent.click(button);
      if (cell === -1) {
        await userEvent.click(screen.getByRole("button", { name: words.torch.cell(place, 1) }));
      }
    }
    await userEvent.click(screen.getByRole("button", { name: words.sweep.button }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
    expect(companionStore.getState().convolution).toBe(true);
  });
});

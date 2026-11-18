import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STAGES, SHOWN, type Answer, type Seen } from "@/engine/vision/seeing";
import { fakeVisionReader } from "@/engine/vision/testing/fake-vision";
import { samplePhoto } from "@/engine/vision/testing/node-vision";
import { setVisionReader } from "@/engine/vision/vision-client";
import { setPhotoReader } from "@/features/inside/use-photo";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { changed, frameFor, smudgeView, type SeeState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as SeeState;
const answer = (name: string, thing: number): Answer[] => [{ thing, name, share: 0.9 }];

const reader = fakeVisionReader({
  see: ({ maps }) => {
    const seen: Seen = { answers: answer("boxer", 242) };
    if (maps) {
      seen.maps = STAGES.map(({ stage, size }) => ({
        stage,
        size,
        maps: new Float32Array(SHOWN * size * size).fill(0.5),
      }));
    }
    return seen;
  },
  // Like the real model on the dog: a smudge of a shade or two changes its answer.
  fool: ({ pixels, strength }) => ({
    before: answer("boxer", 242),
    after: strength <= 2 ? answer("muzzle", 676) : answer("boxer", 242),
    pixels: pixels.map((value, at) => (at % 4 === 3 ? value : value + 1)),
  }),
});

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `how-machines-see-${(lessons += 1)}` }}
      module={definition}
    />,
  );

beforeAll(() => {
  setPhotoReader(async (name) => samplePhoto(name === "cat" || name === "teapot" ? name : "dog"));
  setVisionReader(reader);
});
afterAll(() => {
  setPhotoReader(null);
  setVisionReader(null);
});

describe("how machines see: the smudge", () => {
  it("shows the smudge alone, mid-grey where nothing changed", () => {
    const before = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
    const after = new Uint8ClampedArray([12, 20, 29, 255, 40, 50, 60, 255]);
    expect(Array.from(smudgeView(before, after))).toEqual([255, 128, 64, 255, 128, 128, 128, 255]);
  });

  it("counts only a change of best answer as fooled", () => {
    expect(changed(answer("boxer", 1), answer("muzzle", 2))).toBe(true);
    expect(changed(answer("boxer", 1), answer("boxer", 1))).toBe(false);
  });
});

describe("how machines see: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;
  const faint = { ...initial, smudge: true, strength: 2 };

  it("fires only when a smudge too faint to see changed the answer", () => {
    expect(mission.when(faint, frameFor("dog", faint, "muzzle", true, 1))).toBe(true);
    expect(mission.when(faint, frameFor("dog", faint, "boxer", false, 1))).toBe(false);
    const strong = { ...faint, strength: 6 };
    expect(mission.when(strong, frameFor("dog", strong, "muzzle", true, 1))).toBe(false);
    // A frame from a different strength is out of date.
    expect(mission.when(faint, frameFor("dog", { ...faint, strength: 1 }, "muzzle", true, 1))).toBe(
      false,
    );
    expect(mission.when(initial, frameFor("dog", initial, "boxer", null, 1))).toBe(false);
  });

  it("is answered by trying a faint smudge, whichever way it goes", () => {
    expect(guess.answer(faint, frameFor("dog", faint, "muzzle", true, 1))).toBe("fooled");
    expect(guess.answer(faint, frameFor("dog", faint, "boxer", false, 1))).toBe("same");
    expect(guess.answer(initial, frameFor("dog", initial, "boxer", null, 1))).toBeNull();
    expect(guess.answer(faint, undefined)).toBeNull();
  });
});

describe("how machines see: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { photo: "moon", depth: "deeper", smudge: "yes", strength: 40.4 } as unknown as SeeState,
      initial,
    );
    expect(safe).toEqual({ photo: "dog", depth: "edges", smudge: false, strength: 8 });
  });

  it("describes what is shown", () => {
    expect(definition.describe?.(initial, undefined)).toBe(
      words.describe(words.photos.names.dog, words.depth.names.edges, words.describeSmudge.off),
    );
  });
});

describe("how machines see: in the lesson", () => {
  it("names the photo, shows its maps, and earns the star with a faint smudge", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await waitFor(() => expect(screen.getByText(words.says("boxer"))).toBeInTheDocument());
    expect(document.querySelector("[data-maps]")?.getAttribute("data-maps")).toBe("edges");
    await userEvent.click(screen.getByRole("radio", { name: words.depth.names.parts }));
    expect(document.querySelector("[data-maps]")?.getAttribute("data-maps")).toBe("parts");
    await userEvent.click(screen.getByRole("switch", { name: words.smudge.toggle }));
    await waitFor(() =>
      expect(screen.getByText(words.fooled("boxer", "muzzle"))).toBeInTheDocument(),
    );
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });

  it("asks before using the camera, and keeps the photos when there is no camera", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.camera.use }));
    expect(screen.getByText(words.camera.ask.body)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: words.camera.ask.yes }));
    // The test browser has no camera at all.
    await waitFor(() => expect(screen.getByText(words.camera.states.missing)).toBeInTheDocument());
    await userEvent.click(screen.getByRole("radio", { name: words.photos.names.cat }));
    await waitFor(() => expect(screen.getByText(words.says("boxer"))).toBeInTheDocument());
  });
});

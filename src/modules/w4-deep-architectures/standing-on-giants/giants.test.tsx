import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { count } from "@/design/copy";
import { FEATURES, SIDE } from "@/engine/vision/seeing";
import { fakeVisionReader } from "@/engine/vision/testing/fake-vision";
import { setVisionReader } from "@/engine/vision/vision-client";
import { PHOTO_GROUPS, setPhotoReader } from "@/features/inside/use-photo";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  bestOf,
  frameFor,
  greyDots,
  ready,
  rightOf,
  shares,
  teach,
  type Example,
  type GiantState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as GiantState;

/** A seeded random number in 0–1 (the same pictures every run). */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

/**
 * Sample "photos" of random dots, so bare grey dots tell the groups apart no better than chance,
 * with the group hidden in the first dot's red, which the fake big AI reads, as the real one reads
 * fur or petals.
 */
function fakePhoto(name: string): Uint8ClampedArray {
  const [group = "", index = "1"] = name.split("-");
  const groupIndex = PHOTO_GROUPS.indexOf(group as (typeof PHOTO_GROUPS)[number]);
  const random = seeded(1 + groupIndex * 31 + Number(index) * 7);
  const pixels = new Uint8ClampedArray(SIDE * SIDE * 4).map((_, at) =>
    at % 4 === 3 ? 255 : Math.floor(random() * 256),
  );
  pixels[0] = groupIndex * 80;
  return pixels;
}

const reader = fakeVisionReader({
  see: ({ pixels }) => {
    const features = new Float32Array(FEATURES).fill(0.1);
    const group = Math.round((pixels[0] ?? 0) / 80);
    features[group * 10] = 3;
    features[(pixels[4] ?? 0) % FEATURES] = 0.5;
    return { answers: [{ thing: 1, name: "thing", share: 0.5 }], features };
  },
});

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `standing-on-giants-${(lessons += 1)}` }}
      module={definition}
    />,
  );

beforeAll(() => {
  setPhotoReader(async (name) => fakePhoto(name));
  setVisionReader(reader);
});
afterAll(() => {
  setPhotoReader(null);
  setVisionReader(null);
});

describe("standing on giants: the tiny AI", () => {
  const point = (group: number, wobble: number): Example => {
    const numbers = new Float32Array(FEATURES);
    numbers[group] = 1;
    numbers[100 + wobble] = 0.3;
    return { numbers: ready(numbers), group };
  };

  it("learns three groups from one example each and names new ones", () => {
    const learned = teach([point(0, 0), point(1, 1), point(2, 2)]);
    expect(rightOf(learned, [point(0, 5), point(1, 6), point(2, 7)])).toBe(3);
    const share = shares(learned, point(1, 9).numbers);
    expect(bestOf(share)).toBe(1);
    expect(share.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
  });

  it("shrinks a photo to 16 × 16 grey dots and readies numbers to length 1", () => {
    const white = new Uint8ClampedArray(SIDE * SIDE * 4).fill(255);
    const dots = greyDots(white);
    expect(dots).toHaveLength(256);
    expect(dots[0]).toBeCloseTo(1);
    const numbers = ready([1, 2, 3, 6]);
    expect(numbers.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0);
    expect(Math.hypot(...numbers)).toBeCloseTo(1);
  });
});

describe("standing on giants: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;
  const one = { ...initial, start: "giant" as const, teach: 1 };

  it("fires when one photo of each is enough for most new photos", () => {
    expect(mission.when(one, frameFor(one, { giant: 8, blank: 4 }, 1))).toBe(true);
    const blank = { ...one, start: "blank" as const };
    expect(mission.when(blank, frameFor(blank, { giant: 8, blank: 4 }, 1))).toBe(false);
    expect(mission.when(initial, frameFor(initial, { giant: 9, blank: 9 }, 1))).toBe(false);
  });

  it("is answered by teaching both starts with one photo of each", () => {
    expect(guess.answer(one, frameFor(one, { giant: 8, blank: 4 }, 1))).toBe("giant");
    expect(guess.answer(one, frameFor(one, { giant: 5, blank: 4 }, 1))).toBe("same");
    expect(guess.answer(one, frameFor(one, { giant: 2, blank: 6 }, 1))).toBe("blank");
    expect(guess.answer(initial, frameFor(initial, { giant: 8, blank: 4 }, 1))).toBeNull();
  });
});

describe("standing on giants: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { start: "huge", teach: 0 } as unknown as GiantState,
      initial,
    );
    expect(safe).toEqual({ start: "blank", teach: 1 });
  });

  it("describes the start and the score", () => {
    expect(definition.describe?.(initial, frameFor(initial, { giant: 8, blank: 5 }, 1))).toBe(
      words.describe(
        words.start.short.blank,
        words.teach.names[4]!,
        words.score(count(5), count(9)),
      ),
    );
  });
});

describe("standing on giants: in the lesson", () => {
  it("teaches from scratch, then from the big AI with one photo each, and earns the star", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await waitFor(() =>
      expect(document.querySelector("[data-score]")?.getAttribute("data-score")).not.toBe(""),
    );
    await userEvent.click(screen.getByRole("radio", { name: words.start.names.giant }));
    const dial = screen.getByRole("slider", { name: words.teach.label });
    dial.focus();
    await userEvent.keyboard("{Home}");
    await waitFor(() =>
      expect(screen.getByText(words.score(count(9), count(9)))).toBeInTheDocument(),
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
    await waitFor(() => expect(screen.getByText(words.camera.states.missing)).toBeInTheDocument());
    await waitFor(() =>
      expect(document.querySelector("[data-score]")?.getAttribute("data-score")).not.toBe(""),
    );
  });
});

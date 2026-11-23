import { act, fireEvent, render, screen } from "@testing-library/react";
import { languageFiles, loadWriters } from "@/engine/language/files";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import type { Storyteller } from "@/engine/language/writers";
import { reachable } from "@/engine/rl/gridworld";
import { progressStore } from "@/platform/progress/progress";
import { makeBoard } from "./explorer-show";
import type { Painter, Show } from "./painter";
import { buildShow, hashForProgramme, programmeFromHash, showAt, SHOWS } from "./programme";
import { TheatrePage } from "./TheatrePage";
import { IDLE_MS } from "./use-screen";
import { storyText } from "./words-show";

const LIMIT = 30_000;

/** A canvas context that accepts everything and measures text by its length. */
function fakeContext(): CanvasRenderingContext2D {
  const kept: Record<string, unknown> = {
    measureText: (text: string) => ({ width: text.length * 10 }),
  };
  return new Proxy(kept, {
    get: (target, name: string) => target[name] ?? (() => undefined),
    set: (target, name: string, value) => {
      target[name] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const shape = {} as Path2D;
const painter = (over: Partial<Painter> = {}): Painter => ({
  context: fakeContext(),
  width: 900,
  height: 600,
  palette: {
    ink: "",
    soft: "",
    paper: "",
    card: "",
    hairline: "",
    accent: "",
    groups: ["", ""],
    weights: { up: "", down: "" },
    tiles: { floor: "", wall: "", goal: "", trap: "", coin: "" },
    regions: [[], []],
    values: [],
  },
  shapes: { groups: [shape, shape], tiles: new Map() },
  serif: "",
  sans: "",
  still: false,
  ...over,
});

let teller: Storyteller;
beforeAll(async () => {
  readFilesFromDisk();
  teller = (await loadWriters()).storyteller;
}, LIMIT);
beforeEach(() => {
  vi.stubGlobal(
    "ImageData",
    class {
      data: Uint8ClampedArray;
      constructor(
        readonly width: number,
        readonly height: number,
      ) {
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

const show = (id: (typeof SHOWS)[number], seed = 1): Show => {
  const built = buildShow(id, teller, seed);
  if (!built) throw new Error(`no ${id}`);
  return built;
};

describe("the shows", () => {
  it.each(SHOWS)(
    "%s plays on for half an hour, in large steps and small screens alike",
    (id) => {
      const playing = show(id);
      for (let second = 0; second < 1800; second += 2.5) {
        playing.advance(2.5);
        if (second % 100 === 0) {
          playing.draw(painter());
          playing.draw(painter({ width: 300, height: 500, still: true }));
        }
      }
      expect(playing.describe().length).toBeGreaterThan(10);
      expect(playing.describe().length).toBeLessThan(600);
    },
    LIMIT,
  );

  it("write the same stories again from the same seed, and others from another", () => {
    const stories = (seed: number) => {
      const playing = show("words", seed);
      return Array.from({ length: 120 }, () => {
        playing.advance(0.5);
        return playing.describe();
      }).join("\n");
    };
    expect(stories(3)).toBe(stories(3));
    expect(stories(3)).not.toBe(stories(4));
  });

  it("catch up a little, not a lot, after a long sleep", () => {
    const playing = show("words");
    const before = playing.describe();
    playing.advance(10_000);
    expect(playing.describe().length - before.length).toBeLessThan(60);
  });

  it("only use boards whose bowl can be reached", () => {
    for (let seed = 1; seed <= 200; seed += 1) expect(reachable(makeBoard(seed))).toBe(true);
  });

  it("read a story as sentences", () => {
    expect(storyText(["the", "cat", "sat", ".", "why", "?", "yes"])).toBe("The cat sat. Why? Yes");
    expect(storyText([])).toBe("");
  });
});

describe("the programme", () => {
  it("comes from the address, and from nothing else in it", () => {
    expect(programmeFromHash("#show=shapes")).toBe("shapes");
    expect(programmeFromHash("#show=fireworks")).toBe("turns");
    expect(programmeFromHash("")).toBe("turns");
    for (const id of SHOWS) expect(programmeFromHash(hashForProgramme(id))).toBe(id);
  });

  it("takes turns, leaving out the storyteller when it could not be fetched", () => {
    expect([0, 1, 2, 3].map((turn) => showAt("turns", turn, true))).toEqual([
      "words",
      "shapes",
      "explorer",
      "words",
    ]);
    expect([0, 1, 2].map((turn) => showAt("turns", turn, false))).toEqual([
      "shapes",
      "explorer",
      "shapes",
    ]);
    expect(showAt("words", 5, false)).toBe("words");
  });
});

describe("the theatre page", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/theatre");
    readFilesFromDisk();
  });
  afterEach(() => vi.useRealTimers());
  const stage = () => document.querySelector("main");

  it("opens the show the address asks for, and keeps the address with the choice", async () => {
    window.history.replaceState(null, "", "/theatre#show=explorer");
    render(<TheatrePage />);
    expect(stage()).toHaveAttribute("data-theatre", "explorer");
    fireEvent.click(screen.getByRole("button", { name: "Learning a shape" }));
    expect(stage()).toHaveAttribute("data-theatre", "shapes");
    expect(window.location.hash).toBe("#show=shapes");
    fireEvent.click(screen.getByRole("button", { name: "One after another" }));
    expect(window.location.hash).toBe("");
  });

  it("pauses with Space, but not a Space meant for a button", () => {
    window.history.replaceState(null, "", "/theatre#show=explorer");
    render(<TheatrePage />);
    expect(stage()).toHaveAttribute("data-playing", "true");
    fireEvent.keyDown(window, { key: " " });
    expect(stage()).toHaveAttribute("data-playing", "false");
    expect(screen.getByRole("button", { name: "Carry on" })).toBeVisible();
    fireEvent.keyDown(screen.getByRole("button", { name: "Carry on" }), { key: " " });
    expect(stage()).toHaveAttribute("data-playing", "false");
  });

  it("fades its controls when left alone, brings them back, and keeps them while paused", () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/theatre#show=explorer");
    render(<TheatrePage />);
    act(() => void vi.advanceTimersByTime(IDLE_MS + 10));
    expect(stage()).toHaveAttribute("data-idle", "true");
    act(() => void fireEvent.pointerMove(window));
    expect(stage()).toHaveAttribute("data-idle", "false");
    fireEvent.keyDown(window, { key: " " });
    act(() => void vi.advanceTimersByTime(IDLE_MS * 3));
    expect(stage()).toHaveAttribute("data-idle", "false");
  });

  it(
    "says so when the storyteller cannot be fetched, plays the others, and tries again",
    async () => {
      const read = vi.fn().mockRejectedValue(new Error("offline"));
      readFilesFromDisk();
      const disk = languageFiles.read;
      languageFiles.read = read;
      render(<TheatrePage />);
      expect(await screen.findByText(/couldn’t be fetched/)).toBeVisible();
      expect(stage()).toHaveAttribute("data-theatre", "shapes");
      fireEvent.click(screen.getByRole("button", { name: "Choosing words" }));
      const retry = await screen.findByRole("button", { name: "Try again" });
      languageFiles.read = disk;
      fireEvent.click(retry);
      await vi.waitFor(() => expect(stage()).toHaveAttribute("data-playing", "true"), {
        timeout: 10_000,
      });
    },
    LIMIT,
  );

  it("does not hand out its star for opening the page", () => {
    render(<TheatrePage />);
    expect(progressStore.getState().achievements).not.toContain("theatre");
  });
});

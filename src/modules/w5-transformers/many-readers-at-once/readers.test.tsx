import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as client from "@/engine/pretrained/attention-client";
import type { AttentionReader } from "@/engine/pretrained/attention-client";
import { loadReading, type StoredReading } from "@/engine/pretrained/testing/fixture";
import stored from "@/engine/pretrained/testing/example-reading.json";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { frameOf, type ReadersFrame, type ReadersState } from "./model";
import { predictions } from "./predictions";

const example = loadReading(stored as StoredReading);

vi.mock("@/engine/pretrained/attention-client", async (actual) => {
  const real = await actual<typeof client>();
  const { loadReading: load } = await import("@/engine/pretrained/testing/fixture");
  const recorded = (await import("@/engine/pretrained/testing/example-reading.json")).default;
  const reading = load(recorded as StoredReading);
  const fake = {
    read: (sentence: string) =>
      sentence === recorded.sentence
        ? Promise.resolve(reading)
        : Promise.reject(new Error("unknown")),
    retain: () => () => {},
  } as unknown as AttentionReader;
  return { ...real, attentionReader: () => fake };
});

const initial = definition.initialState as ReadersState;
const at = (change: Partial<ReadersState>): ReadersState => ({ ...initial, ...change });
const shown = (state: ReadersState): ReadersFrame => ({ ...frameOf(example, state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;
const firstOff = (count: number) => Array.from({ length: count }, (_, reader) => 12 - reader);

describe("many readers at once: the picture", () => {
  it("keeps every word's link with every reader on", () => {
    const frame = shown(initial);
    expect(frame.agree).toBe(frame.words);
  });

  it("loses links as readers go", () => {
    expect(shown(at({ off: firstOff(10) })).agree).toBeLessThan(shown(initial).agree);
  });

  it("finds the readers looking for different things", () => {
    expect(guess.answer(initial, shown(initial))).toBe("different");
  });
});

describe("many readers at once: the mission", () => {
  it("fires once most words lose their link, on the frame on screen", () => {
    const state = at({ off: firstOff(10) });
    expect(mission.when(state, shown(state))).toBe(true);
    expect(mission.when(state, shown(initial))).toBe(false);
  });

  it("does not fire with every reader on, or every reader off", () => {
    expect(mission.when(initial, shown(initial))).toBe(false);
    const none = at({ off: firstOff(12) });
    expect(mission.when(none, shown(none))).toBe(false);
  });
});

describe("many readers at once: links and words", () => {
  it("keeps a hand-made link to real readers and depths", () => {
    const safe = definition.parseState!(
      {
        sentence: "x".repeat(200),
        depth: 40,
        off: [3, 3, 99, -1, 2.5, 7],
      } as unknown as ReadersState,
      initial,
    ) as ReadersState;
    expect(safe).toEqual({ sentence: "x".repeat(90), depth: 6, off: [3, 7] });
  });

  it("describes how many readers are on", () => {
    expect(definition.describe?.(initial, shown(initial))).toMatch(/^12 readers are switched on/);
  });
});

describe("many readers at once: in the lesson", () => {
  it("earns the star by switching readers off", async () => {
    render(<ModuleShell lesson={{ ...valleyLesson, id: "many-readers-1" }} module={definition} />);
    await waitFor(() => expect(document.querySelector("[data-reader]")).not.toBeNull(), {
      timeout: 10_000,
    });
    for (const reader of firstOff(10)) {
      await userEvent.click(document.querySelector(`[data-reader="${reader}"]`) as HTMLElement);
    }
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(screen.getByRole("button", { name: words.allOn })).toBeInTheDocument();
  }, 20_000);

  it("switches readers off from the readers dial", async () => {
    render(<ModuleShell lesson={{ ...valleyLesson, id: "many-readers-2" }} module={definition} />);
    await waitFor(() => expect(document.querySelector("[data-reader]")).not.toBeNull(), {
      timeout: 10_000,
    });
    const dial = screen.getAllByRole("slider", { name: words.count.label })[0] as HTMLElement;
    dial.focus();
    await userEvent.keyboard("{ArrowLeft>3/}");
    await waitFor(() =>
      expect(document.querySelectorAll('[data-reader][aria-pressed="false"]')).toHaveLength(3),
    );
  }, 20_000);
});

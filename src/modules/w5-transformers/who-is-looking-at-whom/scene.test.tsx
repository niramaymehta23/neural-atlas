import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { Reading } from "@/engine/pretrained/attention";
import type * as client from "@/engine/pretrained/attention-client";
import { ReaderError, type AttentionReader } from "@/engine/pretrained/attention-client";
import { Timeline } from "@/engine/timeline/timeline";
import { words } from "./captions";
import { definition } from "./index";
import type { LookingFrame, LookingState } from "./model";

/** A reader whose answers the test hands out by hand. */
const reader = vi.hoisted(() => ({
  asked: [] as string[],
  answers: new Map<string, { resolve: (r: Reading) => void; reject: (e: Error) => void }>(),
  progress: null as number | null,
  listeners: new Set<() => void>(),
}));

vi.mock("@/engine/pretrained/attention-client", async (actual) => {
  const real = await actual<typeof client>();
  const fake = {
    read: (sentence: string) => {
      reader.asked.push(sentence);
      return new Promise<Reading>((resolve, reject) =>
        reader.answers.set(sentence, { resolve, reject }),
      );
    },
    retain: () => () => {},
    getProgress: () => reader.progress,
    subscribe: (listener: () => void) => {
      reader.listeners.add(listener);
      return () => reader.listeners.delete(listener);
    },
  } as unknown as AttentionReader;
  return { ...real, attentionReader: () => fake };
});

const { LookingScene } = await import("./scene");

const initial = definition.initialState as LookingState;

function evenly(sentence: string): Reading {
  const list = sentence.split(" ");
  const size = list.length + 2;
  return {
    words: list,
    pieces: list.map(() => 1),
    weights: new Float32Array(size * size).fill(1 / size),
    layers: 1,
    heads: 1,
  };
}

function Harness({ start }: { start: Partial<LookingState> }) {
  const [state, setState] = useState<LookingState>({ ...initial, ...start });
  const [timeline] = useState(() => new Timeline<LookingFrame>());
  return (
    <LookingScene
      state={state}
      update={(change) =>
        setState((now) => ({ ...now, ...(typeof change === "function" ? change(now) : change) }))
      }
      timeline={timeline}
      side="main"
    />
  );
}

const settle = () => act(() => vi.advanceTimersByTimeAsync(300));
const answer = async (sentence: string, how: Reading | Error = evenly(sentence)) => {
  const waiting = reader.answers.get(sentence);
  await act(async () => (how instanceof Error ? waiting?.reject(how) : waiting?.resolve(how)));
};

describe("the attention scene", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reader.asked = [];
    reader.answers.clear();
    reader.progress = null;
  });
  afterEach(() => vi.useRealTimers());

  it("shows how far the reader has arrived while it wakes up (ATT-03)", async () => {
    reader.progress = 0.5;
    render(<Harness start={{}} />);
    const bar = screen.getByRole("progressbar", { name: words.progress.label });
    expect(bar).toHaveAttribute("aria-valuetext", "About half there");
    expect(screen.getByText(words.intro)).toBeInTheDocument();
    await settle();
    await answer(words.example);
    expect(screen.getByTestId("looking")).toHaveAttribute("data-ready", "true");
  });

  it("asks for a few words instead of going silent (ATT-07)", async () => {
    render(<Harness start={{ sentence: "hello" }} />);
    await settle();
    expect(screen.getByText(words.fewWords)).toBeInTheDocument();
    expect(reader.asked).toEqual([]);
  });

  it("says which part failed and tries again on request (ATT-06)", async () => {
    render(<Harness start={{ sentence: "a cat sat" }} />);
    await settle();
    await answer("a cat sat", new ReaderError("load", "no model"));
    expect(screen.getByRole("alert")).toHaveTextContent(words.failed);
    fireEvent.click(screen.getByRole("button", { name: words.retry }));
    await settle();
    await answer("a cat sat", new ReaderError("read", "bad sentence"));
    expect(screen.getByRole("alert")).toHaveTextContent(words.unreadable);
  });

  it("dims the old picture while a new sentence is read (ATT-15)", async () => {
    render(<Harness start={{ sentence: "a cat sat" }} />);
    await settle();
    await answer("a cat sat");
    const scene = screen.getByTestId("looking");
    expect(scene).toHaveAttribute("data-reading", "false");
    fireEvent.change(screen.getByRole("textbox", { name: words.sentence }), {
      target: { value: "a cat sat down" },
    });
    expect(scene).toHaveAttribute("data-reading", "true");
    expect(scene).toHaveAttribute("data-ready", "false");
    expect(screen.getByText(words.reading)).toBeInTheDocument();
    await settle();
    await answer("a cat sat down");
    expect(scene).toHaveAttribute("data-reading", "false");
  });

  it("offers the example sentence back when the guess cannot be answered (ATT-08)", async () => {
    render(<Harness start={{ sentence: "a cat sat" }} />);
    await settle();
    await answer("a cat sat");
    expect(screen.getByText(words.guessNeedsExample)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: words.bringBack }));
    expect(screen.getByRole("textbox", { name: words.sentence })).toHaveValue(words.example);
    expect(screen.queryByRole("button", { name: words.bringBack })).toBeNull();
  });

  it("says when only the first sixteen words are read (ATT-11)", async () => {
    const long = Array.from({ length: 18 }, () => "ox").join(" ");
    render(<Harness start={{ sentence: long }} />);
    expect(screen.getByText(words.unread)).toBeInTheDocument();
    await settle();
    expect(reader.asked).toEqual([Array.from({ length: 16 }, () => "ox").join(" ")]);
  });
});

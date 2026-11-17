import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Threads } from "@/engine/pretrained/attention";
import { focusAfterMove, moveWord } from "./model";
import { layout, thread } from "./layout";
import { EVERYONE_TOP, ThreadView } from "./threads";

const LOOKS = [
  [0, 0.7, 0.2, 0.1],
  [0.5, 0, 0.3, 0.2],
  [0.1, 0.1, 0, 0.8],
  [0.25, 0.25, 0.5, 0],
];

function Harness({ start = 1 }: { start?: number }) {
  const [sentence, setSentence] = useState("the dog ran home");
  const [focus, setFocus] = useState(start);
  const words = sentence.split(" ");
  return (
    <ThreadView
      threads={{ words, looks: LOOKS }}
      focus={focus}
      onFocus={setFocus}
      onMove={(from, to) => {
        setSentence(moveWord(sentence, from, to));
        setFocus(focusAfterMove(focus, from, to));
      }}
    />
  );
}

const wordsNow = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-word]")].map((chip) => chip.getAttribute("data-word"));

describe("ThreadView", () => {
  it("moves the chosen word with buttons beside it, no dragging needed", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Move “dog” one place earlier" }));
    expect(wordsNow(container)).toEqual(["dog", "the", "ran", "home"]);
    expect(screen.getByRole("button", { name: "Move “dog” one place earlier" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Move “dog” one place later" }));
    await user.click(screen.getByRole("button", { name: "Move “dog” one place later" }));
    expect(wordsNow(container)).toEqual(["the", "ran", "dog", "home"]);
    expect(container.querySelector("[aria-live]")).toHaveTextContent("“dog” moved after “ran”.");
  });

  it("picks a word up with Space, moves it with the arrows and puts it down (ATT-13)", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness start={-1} />);
    const live = container.querySelector("[aria-live]");
    act(() => (container.querySelector("[data-word=dog]") as HTMLElement).focus());
    await user.keyboard(" ");
    expect(live).toHaveTextContent(/Picked up “dog”/);
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(live).toHaveTextContent("“dog” is now after “home”.");
    await user.keyboard(" ");
    expect(wordsNow(container)).toEqual(["the", "ran", "home", "dog"]);
    expect(live).toHaveTextContent("“dog” moved after “home”.");
    // Space picked up and put down: it never toggled the word's threads.
    expect(container.querySelector("[data-word=dog]")).toHaveAttribute("aria-pressed", "false");
  });

  it("Escape puts a picked-up word back where it was", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness start={-1} />);
    act(() => (container.querySelector("[data-word=the]") as HTMLElement).focus());
    await user.keyboard(" {ArrowRight}{Escape}");
    expect(wordsNow(container)).toEqual(["the", "dog", "ran", "home"]);
    expect(container.querySelector("[aria-live]")).toHaveTextContent("“the” is back where it was.");
  });

  it("names its keys on every word, with no Alt+arrow that browsers use for Back", () => {
    const { container } = render(<Harness />);
    for (const chip of container.querySelectorAll("[data-word]")) {
      expect(chip).toHaveAttribute("aria-keyshortcuts", "Space ArrowLeft ArrowRight Escape");
      expect(chip.getAttribute("aria-keyshortcuts")).not.toMatch(/Alt/);
    }
  });

  it("tells screen readers who each word looks at (ATT-14)", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "dog", pressed: true })).toHaveAccessibleDescription(
      /^It looks most at “the”, then at “ran”\./,
    );
  });

  it("draws threads as thick as the real share, not stretched per word (ATT-10)", () => {
    const { container } = render(<Harness />);
    const strengths = [...container.querySelectorAll("[data-thread]")].map((thread) => [
      thread.getAttribute("data-thread"),
      Number(thread.getAttribute("data-strength")),
    ]);
    expect(strengths).toEqual([
      ["dog>the", 0.5],
      ["dog>ran", 0.3],
      ["dog>home", 0.2],
    ]);
  });

  it("draws later words over the top and earlier words underneath (ATT-10)", () => {
    const { container } = render(<Harness />);
    const side = (name: string) =>
      container.querySelector(`[data-thread="${name}"]`)?.getAttribute("data-side");
    // jsdom has no sizes: the box is 0 wide, so the words stand in a column.
    expect(side("dog>ran")).toBe("right");
    expect(side("dog>the")).toBe("left");
    const sizes = Array.from({ length: 6 }, () => ({ width: 60, height: 32 }));
    const row = layout(sizes, 600);
    expect(row.orientation).toBe("row");
    expect(thread(row, 0, 3).d).not.toBe(thread(row, 3, 0).d);
    expect([thread(row, 0, 3).side, thread(row, 3, 0).side]).toEqual(["over", "under"]);
    const column = layout(sizes, 300);
    expect(column.orientation).toBe("column");
    expect([thread(column, 0, 3).side, thread(column, 3, 0).side]).toEqual(["right", "left"]);
  });

  it("shows only each word's strongest threads when everyone's are drawn (ATT-11)", () => {
    const { container } = render(<Harness start={-1} />);
    const threads = [...container.querySelectorAll("[data-thread]")];
    expect(threads).toHaveLength(4 * EVERYONE_TOP);
    expect(threads.map((thread) => thread.getAttribute("data-thread"))).toContain("ran>home");
  });

  it("a press that becomes a drag does not also pick the word (ATT-12)", () => {
    const onFocus = vi.fn();
    const threads: Threads = { words: ["the", "dog", "ran", "home"], looks: LOOKS };
    render(<ThreadView threads={threads} focus={-1} onFocus={onFocus} onMove={vi.fn()} />);
    const dog = screen.getByRole("button", { name: "dog" });
    fireEvent.pointerDown(dog, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 100 });
    fireEvent.pointerMove(dog, { pointerId: 1, pointerType: "mouse", clientX: 160 });
    fireEvent.pointerUp(dog, { pointerId: 1, pointerType: "mouse", clientX: 160 });
    fireEvent.click(dog);
    expect(onFocus).not.toHaveBeenCalled();
    fireEvent.click(dog);
    expect(onFocus).toHaveBeenCalledWith(1);
  });
});

describe("layout (ATT-11, A11Y-19)", () => {
  type Box = { left: number; right: number; top: number; bottom: number };
  const boxes = (widths: number[], box: number) => {
    const place = layout(
      widths.map((width) => ({ width, height: 32 })),
      box,
    );
    const edges: Box[] = place.x.map((x, index) => ({
      left: x - widths[index]! / 2,
      right: x + widths[index]! / 2,
      top: place.y[index]! - 16,
      bottom: place.y[index]! + 16,
    }));
    const overlap = edges.some((a, i) =>
      edges.some(
        (b, j) =>
          j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
      ),
    );
    const outside = edges.some(({ left, right }) => left < 0 || right > place.width);
    return { place, overlap, outside };
  };

  it("lays a sentence that fits out in a row, without sideways scrolling", () => {
    const { place, overlap, outside } = boxes(
      Array.from({ length: 11 }, () => 50),
      900,
    );
    expect(place.orientation).toBe("row");
    expect(place.width).toBe(900);
    expect([overlap, outside]).toEqual([false, false]);
  });

  it("stands sixteen long words in a column on a phone, never overlapping or too wide", () => {
    const widths = Array.from({ length: 16 }, (_, index) => 60 + (index % 5) * 20);
    const { place, overlap, outside } = boxes(widths, 343);
    expect(place.orientation).toBe("column");
    expect(place.width).toBe(343);
    expect([overlap, outside]).toEqual([false, false]);
  });

  it("bows the middle of the words out into a gentle arc", () => {
    const row = layout(
      Array.from({ length: 5 }, () => ({ width: 50, height: 32 })),
      600,
    );
    expect(row.y[2]).toBeLessThan(row.y[0]!);
    expect(row.y[0]).toBeCloseTo(row.y[4]!);
    const column = layout(
      Array.from({ length: 5 }, () => ({ width: 50, height: 32 })),
      200,
    );
    expect(column.x[2]).toBeGreaterThan(column.x[0]!);
  });
});

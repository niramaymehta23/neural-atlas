import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { classTone } from "@/design/encodings";
import type { Point } from "./datasets";
import { HOLD_MS, PaintCanvas } from "./PaintCanvas";

function Harness({ onAdd }: { onAdd: (point: Point) => void }) {
  const [points, setPoints] = useState<Point[]>([]);
  return (
    <PaintCanvas
      label="Garden: plant apples"
      group={1}
      points={points}
      onAdd={(point) => {
        onAdd(point);
        setPoints((current) => [...current, point]);
      }}
    />
  );
}

describe("PaintCanvas", () => {
  it("plants points of the chosen group from the keyboard", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const { container } = render(<Harness onAdd={onAdd} />);
    const board = screen.getByRole("application", { name: "Garden: plant apples" });
    await user.tab();
    expect(board).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowUp}{Enter}");
    expect(onAdd).toHaveBeenCalledWith({ x: 0.1, y: 0.05, label: 1 });
    const dot = container.querySelector("[data-group]");
    expect(dot).toHaveAttribute("fill", classTone(1));
    expect(container.querySelector("[data-cursor]")).not.toBeNull();
  });

  it("plants where it is clicked", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    const board = screen.getByRole("application");
    board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect;
    await user.pointer({
      target: board,
      coords: { clientX: 150, clientY: 50 },
      keys: "[MouseLeft]",
    });
    expect(onAdd).toHaveBeenCalledWith({ x: 0.5, y: 0.5, label: 1 });
  });

  it("draws each group in its own shape, outlined in ink", () => {
    const { container } = render(
      <PaintCanvas
        label="Garden"
        group={0}
        onAdd={() => undefined}
        points={[
          { x: 0, y: 0, label: 0 },
          { x: 0.5, y: 0.5, label: 1 },
        ]}
      />,
    );
    const [first, second] = container.querySelectorAll("[data-group]");
    expect(first).toHaveAttribute("data-shape", "circle");
    expect(second).toHaveAttribute("data-shape", "triangle");
    expect(first?.getAttribute("d")).not.toBe(second?.getAttribute("d"));
    expect(second).toHaveAttribute("stroke", "var(--color-ink)");
  });

  it("tells keyboard users where the ring is and what they planted", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PaintCanvas
        label="Garden"
        group={0}
        points={[]}
        onAdd={() => undefined}
        words={{
          instructions: "Arrow keys move the ring; Enter plants.",
          position: (across, up) => `${across}% across, ${up}% up`,
          planted: (group, across, up) =>
            `Planted a ${group === 0 ? "daisy" : "tulip"} at ${across}% across, ${up}% up`,
        }}
      />,
    );
    const garden = screen.getByRole("application", { name: "Garden" });
    expect(garden).toHaveAccessibleDescription("Arrow keys move the ring; Enter plants.");
    await user.tab();
    const live = container.querySelector("[aria-live=polite]");
    expect(live).toHaveTextContent("50% across, 50% up");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(live).toHaveTextContent("55% across, 50% up");
    await user.keyboard("{Enter}");
    expect(live).toHaveTextContent("Planted a daisy at 55% across, 50% up");
  });
});

describe("PaintCanvas pulling up and touch (MLP-04, QL-14)", () => {
  const box = { left: 0, top: 0, width: 200, height: 200 } as DOMRect;
  const garden: Point[] = [
    { x: 0.5, y: 0.5, label: 0 },
    { x: 0.52, y: 0.48, label: 1 },
    { x: -0.5, y: -0.5, label: 0 },
  ];

  it("pulls up the flowers within reach of a click", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onAdd = vi.fn();
    render(
      <PaintCanvas
        label="Garden"
        group={0}
        points={garden}
        onAdd={onAdd}
        onRemove={onRemove}
        erasing
      />,
    );
    const board = screen.getByRole("application");
    board.getBoundingClientRect = () => box;
    await user.pointer({
      target: board,
      coords: { clientX: 150, clientY: 50 },
      keys: "[MouseLeft]",
    });
    expect(onRemove).toHaveBeenCalledWith([0, 1]);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("pulls up from the keyboard ring and says what went", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const { container } = render(
      <PaintCanvas
        label="Garden"
        group={0}
        points={garden}
        onAdd={() => undefined}
        onRemove={onRemove}
        erasing
        words={{
          instructions: "Arrows move; Enter pulls up.",
          position: () => "",
          planted: () => "",
          removed: (count, across, up) => `Pulled up ${count} at ${across}% across, ${up}% up`,
        }}
      />,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft>10/}{ArrowDown>10/}{Enter}");
    expect(onRemove).toHaveBeenCalledWith([2]);
    expect(container.querySelector("[aria-live=polite]")).toHaveTextContent(
      "Pulled up 1 at 25% across, 25% up",
    );
  });

  describe("on a touch screen", () => {
    function touchBoard() {
      const onAdd = vi.fn();
      render(<PaintCanvas label="Garden" group={1} points={[]} onAdd={onAdd} />);
      const board = screen.getByRole("application");
      board.getBoundingClientRect = () => box;
      const at = (x: number, y: number) => ({
        pointerId: 7,
        pointerType: "touch",
        clientX: x,
        clientY: y,
      });
      return { board, onAdd, at };
    }

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("lets a finger swipe scroll the page without planting", () => {
      const { board, onAdd, at } = touchBoard();
      expect(board.className).toContain("touch-pan-y");
      fireEvent.pointerDown(board, at(100, 100));
      fireEvent.pointerMove(board, at(100, 130));
      fireEvent.pointerCancel(board, at(100, 160));
      act(() => vi.advanceTimersByTime(HOLD_MS * 2));
      fireEvent.pointerUp(board, at(100, 160));
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("plants once for a quick tap, and paints along a held finger", () => {
      const { board, onAdd, at } = touchBoard();
      fireEvent.pointerDown(board, at(100, 100));
      fireEvent.pointerUp(board, at(100, 100));
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenLastCalledWith({ x: 0, y: 0, label: 1 });

      fireEvent.pointerDown(board, at(50, 50));
      act(() => vi.advanceTimersByTime(HOLD_MS));
      expect(onAdd).toHaveBeenCalledTimes(2);
      fireEvent.pointerMove(board, at(150, 50));
      expect(onAdd).toHaveBeenCalledTimes(3);
      fireEvent.pointerUp(board, at(150, 50));
      expect(onAdd).toHaveBeenCalledTimes(3);
    });
  });
});

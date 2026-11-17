import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { classTone } from "@/design/encodings";
import type { Point } from "./datasets";
import { PaintCanvas } from "./PaintCanvas";

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

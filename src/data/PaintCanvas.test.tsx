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
});

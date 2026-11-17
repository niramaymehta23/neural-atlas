import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Board } from "./Board";

describe("Board painting", () => {
  it("paints the square under the keyboard cursor and tints floor squares", async () => {
    const painted: number[] = [];
    render(
      <Board
        columns={2}
        tiles={["floor", "floor", "floor", "floor"]}
        label="A tiny board"
        onPaint={(index) => painted.push(index)}
        floorTones={["var(--color-sand)"]}
      />,
    );
    const board = screen.getByRole("application", { name: "A tiny board" });
    board.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowDown}{Enter}");
    expect(painted).toEqual([3]);
    expect(board.querySelector("rect")).toHaveAttribute("fill", "var(--color-sand)");
  });

  it("stays a plain picture when it cannot be painted", () => {
    render(<Board columns={2} tiles={["floor", "wall"]} label="A still board" />);
    expect(screen.queryByRole("application")).toBeNull();
    expect(screen.getByRole("img", { name: "A still board" })).toBeInTheDocument();
  });

  it("starts the cursor on the piece and says which square it is on", async () => {
    const painted: number[] = [];
    const { container } = render(
      <Board
        columns={3}
        tiles={["floor", "floor", "floor", "floor", "floor", "trap"]}
        piece={{ row: 0, column: 1 }}
        label="A small kitchen"
        onPaint={(index) => painted.push(index)}
        words={{
          instructions: "Arrow keys move; Enter paints.",
          square: (row, column, kind) => `Row ${row}, square ${column}: ${kind}`,
        }}
      />,
    );
    const board = screen.getByRole("application", { name: "A small kitchen" });
    expect(board).toHaveAccessibleDescription("Arrow keys move; Enter paints.");
    act(() => board.focus());
    const live = container.querySelector("[aria-live=polite]");
    expect(live).toHaveTextContent("Row 1, square 2: floor");
    expect(container.querySelector("[data-cursor] rect")).toHaveAttribute("stroke-width", "3");
    await userEvent.keyboard("{ArrowRight}{ArrowDown}");
    expect(live).toHaveTextContent("Row 2, square 3: trap");
    await userEvent.keyboard("{Enter}");
    expect(painted).toEqual([5]);
  });
});

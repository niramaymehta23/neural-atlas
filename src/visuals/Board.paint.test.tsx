import { render, screen } from "@testing-library/react";
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
});

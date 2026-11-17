import { render, screen } from "@testing-library/react";
import { tileTone } from "@/design/encodings";
import { Board } from "./Board";
import { Chart } from "./Chart";

describe("Board", () => {
  it("lays out squares by kind with the learner on top", () => {
    const { container } = render(
      <Board
        columns={3}
        tiles={["floor", "wall", "goal", "trap", "floor", "floor"]}
        piece={{ row: 1, column: 2 }}
        label="A small garden"
      />,
    );
    expect(screen.getByRole("img", { name: "A small garden" })).toBeInTheDocument();
    expect(container.querySelectorAll("rect")).toHaveLength(6);
    expect(container.querySelector('[data-tile="goal"]')).toHaveAttribute("fill", tileTone("goal"));
    expect(container.querySelector("circle")).toHaveAttribute("fill", "var(--color-accent)");
  });

  it("marks each special square with its own glyph and value tints with + or −", () => {
    const { container } = render(
      <Board
        columns={3}
        tiles={["floor", "wall", "goal", "trap", "coin", "floor"]}
        floorValues={[0.6, 0, 0, 0, 0, -0.6]}
        label="A small kitchen"
      />,
    );
    const marks = [...container.querySelectorAll("[data-mark]")].map((mark) =>
      mark.getAttribute("data-mark"),
    );
    expect(marks).toEqual(["plus", "hatch", "bowl", "lava", "treat", "minus"]);
    for (const mark of container.querySelectorAll("[data-mark]"))
      expect(mark).toHaveAttribute("stroke", "var(--color-ink)");
  });
});

describe("Chart", () => {
  it("draws every series on one scale, the ghost dashed, with a moment marker", () => {
    const { container } = render(
      <Chart
        label="Mistakes shrinking"
        series={[{ values: [3, 2, 1] }, { values: [4, 3], ghost: true }]}
        marker={1}
        width={100}
        height={40}
      />,
    );
    const [current, ghost] = container.querySelectorAll("path");
    expect(current).toHaveAttribute("d", "M0.00 13.33 L50.00 26.67 L100.00 40.00");
    expect(ghost).toHaveAttribute("stroke-dasharray", "4 4");
    expect(container.querySelectorAll("line")[1]).toHaveAttribute("x1", "50");
  });
});

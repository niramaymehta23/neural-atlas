import { act, fireEvent, render, screen } from "@testing-library/react";
import { tileTone } from "@/design/encodings";
import { Board, PAINT_HOLD_MS } from "./Board";
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
    expect(container.querySelector('[data-piece="puppy"]')).toBeInTheDocument();
    expect(container.querySelector("[data-skid-marks]")).toBeNull();
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

describe("Board painting", () => {
  const board = (onPaint: (index: number) => void) => {
    const { container } = render(
      <Board
        columns={2}
        tiles={["floor", "floor", "floor", "floor"]}
        label="A tiny kitchen"
        onPaint={onPaint}
        words={{ instructions: "Paint", square: () => "square" }}
      />,
    );
    const svg = container.querySelector("svg") as SVGSVGElement;
    // Two 48px squares a side, drawn 1:1 from the page's top left corner.
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }) as DOMRect;
    return svg;
  };
  const at = (x: number, y: number, pointerType: string) => ({
    clientX: x,
    clientY: y,
    pointerId: 1,
    pointerType,
  });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("paints at once under a mouse", () => {
    const onPaint = vi.fn();
    const svg = board(onPaint);
    fireEvent.pointerDown(svg, at(10, 10, "mouse"));
    fireEvent.pointerMove(svg, at(70, 10, "mouse"));
    expect(onPaint.mock.calls).toEqual([[0], [1]]);
  });

  it("lets a finger swipe scroll the page without painting (QL-14)", () => {
    const onPaint = vi.fn();
    const svg = board(onPaint);
    expect(svg.getAttribute("class")).not.toContain("touch-none");
    fireEvent.pointerDown(svg, at(10, 10, "touch"));
    fireEvent.pointerMove(svg, at(10, 60, "touch"));
    act(() => vi.advanceTimersByTime(PAINT_HOLD_MS * 2));
    fireEvent.pointerUp(svg, at(10, 90, "touch"));
    expect(onPaint).not.toHaveBeenCalled();
  });

  it("paints a tapped square, and drags paint after a hold", () => {
    const onPaint = vi.fn();
    const svg = board(onPaint);
    fireEvent.pointerDown(svg, at(70, 70, "touch"));
    fireEvent.pointerUp(svg, at(70, 70, "touch"));
    expect(onPaint.mock.calls).toEqual([[3]]);

    onPaint.mockClear();
    fireEvent.pointerDown(svg, at(10, 10, "touch"));
    act(() => vi.advanceTimersByTime(PAINT_HOLD_MS));
    fireEvent.pointerMove(svg, at(10, 70, "touch"));
    fireEvent.pointerUp(svg, at(10, 70, "touch"));
    expect(onPaint.mock.calls).toEqual([[0], [2]]);
  });

  it("shows a skid when the puppy slips", () => {
    const { container } = render(
      <Board columns={1} tiles={["floor"]} piece={{ row: 0, column: 0 }} skid label="Slip" />,
    );
    expect(container.querySelector("[data-skid-marks]")).toBeInTheDocument();
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

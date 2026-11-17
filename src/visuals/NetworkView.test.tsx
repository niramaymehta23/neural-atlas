import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { thickness, weightTone } from "@/design/encodings";
import { mockReducedMotion } from "@/design/reduced-motion.mock";
import { layoutEdges, layoutNeurons } from "./network-layout";
import { NetworkView } from "./NetworkView";

// [2, 3, 1]: neuron weights then bias, layer by layer.
const PARAMS = [0.5, -1, 0.1, 2, 0, 0.2, -0.25, 0.75, 0.3, 1, -0.5, 0.25, 0.4];

describe("network layout", () => {
  it("reads weights in the autodiff order and skips biases", () => {
    const edges = layoutEdges(layoutNeurons([2, 3, 1], 400, 200), PARAMS);
    expect(edges.map(({ weight }) => weight)).toEqual([0.5, -1, 2, 0, -0.25, 0.75, 1, -0.5, 0.25]);
    expect(edges.find(({ weight }) => weight === 2)?.strength).toBe(1);
    expect(edges.find(({ weight }) => weight === -1)?.strength).toBe(0.5);
  });

  it("is calm with no weights yet", () => {
    const edges = layoutEdges(layoutNeurons([2, 2], 100, 100), null);
    expect(edges.every(({ strength }) => strength === 0)).toBe(true);
  });
});

describe("NetworkView", () => {
  it("draws each connection thicker when stronger and coloured by its sign", () => {
    const { container } = render(
      <NetworkView sizes={[2, 3, 1]} params={PARAMS} label="A small network" />,
    );
    expect(screen.getByRole("img", { name: "A small network" })).toBeInTheDocument();
    const lines = [...container.querySelectorAll("line")];
    expect(lines).toHaveLength(9);
    const strongest = lines[2];
    expect(strongest).toHaveAttribute("stroke-width", String(thickness(1)));
    expect(strongest).toHaveAttribute("stroke", weightTone(2));
    expect(lines[1]).toHaveAttribute("stroke", weightTone(-1));
    expect(container.querySelectorAll("circle")).toHaveLength(12); // a paper disc + a fill each
  });

  it("swaps the moving dots for a still gradient weighted by activity under reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(
      <NetworkView sizes={[2, 1]} params={[1, 0.5, 0]} label="Two inputs" flowing />,
    );
    expect(container.querySelector("canvas")).toBeNull();
    const still = container.querySelector("[data-still]");
    expect(still?.querySelectorAll("line")).toHaveLength(2);
    const ends = [...(still?.querySelectorAll('stop[offset="1"]') ?? [])].map((stop) =>
      Number(stop.getAttribute("stop-opacity")),
    );
    expect(ends[0]).toBeGreaterThan(ends[1] ?? 1);
  });

  it("dashes negative connections so the sign does not rest on colour", () => {
    const { container } = render(
      <NetworkView sizes={[2, 3, 1]} params={PARAMS} label="A small network" />,
    );
    const lines = [...container.querySelectorAll("line")];
    expect(lines[1]).toHaveAttribute("stroke-dasharray");
    expect(lines[2]).not.toHaveAttribute("stroke-dasharray");
    expect(lines[2]).not.toHaveAttribute("stroke-opacity");
  });
});

describe("NetworkView while learning (MLP-07)", () => {
  it("sends the moving dots backwards, as busy as each thread's change", () => {
    mockReducedMotion(true);
    const { container } = render(
      <NetworkView
        sizes={[2, 1]}
        params={[1, 1, 0]}
        label="Two inputs"
        flowing
        backward
        flowActivity={[0.2, 0.9]}
      />,
    );
    const [first, second] = container.querySelectorAll("[data-still] line");
    const edges = layoutEdges(layoutNeurons([2, 1], 480, 300), [1, 1, 0]);
    // Backwards: each dot starts at the cell and runs to the input.
    expect(Number(first?.getAttribute("x1"))).toBe(edges[0]!.to[0]);
    expect(Number(first?.getAttribute("x2"))).toBe(edges[0]!.from[0]);
    expect(Number(first?.getAttribute("data-activity"))).toBe(0.2);
    expect(Number(second?.getAttribute("data-activity"))).toBe(0.9);
  });

  it("makes each hidden cell a button that shows it, by pointer, focus or tap", async () => {
    const user = userEvent.setup();
    const onCell = vi.fn();
    render(
      <NetworkView
        sizes={[2, 3, 2, 1]}
        params={null}
        label="A team"
        cellLabel={({ layer, cell }) => `Cell ${cell + 1} of layer ${layer + 1}`}
        onCell={onCell}
      />,
    );
    const cells = screen.getAllByRole("button");
    expect(cells).toHaveLength(5);
    await user.hover(screen.getByRole("button", { name: "Cell 2 of layer 1" }));
    expect(onCell).toHaveBeenLastCalledWith({ layer: 0, cell: 1 });
    await user.unhover(screen.getByRole("button", { name: "Cell 2 of layer 1" }));
    expect(onCell).toHaveBeenLastCalledWith(null);
    await user.click(screen.getByRole("button", { name: "Cell 1 of layer 2" }));
    expect(onCell).toHaveBeenLastCalledWith({ layer: 1, cell: 0 });
  });
});

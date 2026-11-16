import { render, screen } from "@testing-library/react";
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

  it("drops the moving dots under reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(
      <NetworkView sizes={[2, 1]} params={[1, 1, 0]} label="Two inputs" flowing />,
    );
    expect(container.querySelector("canvas")).toBeNull();
  });
});

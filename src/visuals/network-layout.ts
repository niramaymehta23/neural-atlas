/** Where each neuron sits and which weight joins which pair, for a stack of layers. */
export type Point = readonly [number, number];
export type EdgeLayout = { from: Point; to: Point; weight: number; strength: number };

const PAD = 28;

/** Neurons per layer, spread evenly in columns across the box. */
export function layoutNeurons(sizes: readonly number[], width: number, height: number): Point[][] {
  const columnGap = sizes.length > 1 ? (width - 2 * PAD) / (sizes.length - 1) : 0;
  return sizes.map((size, layer) => {
    const rowGap = (height - 2 * PAD) / Math.max(1, size);
    return Array.from({ length: size }, (_, row): Point => [
      PAD + layer * columnGap,
      PAD + rowGap * (row + 0.5),
    ]);
  });
}

/**
 * Every connection, reading weights in the autodiff order (layer by layer, neuron by neuron,
 * weights then bias). Strength is |weight| against the strongest one shown.
 */
export function layoutEdges(
  neurons: readonly Point[][],
  params: ArrayLike<number> | null,
): EdgeLayout[] {
  const edges: EdgeLayout[] = [];
  let at = 0;
  for (let layer = 1; layer < neurons.length; layer += 1) {
    const inputs = neurons[layer - 1] ?? [];
    for (const to of neurons[layer] ?? []) {
      for (const from of inputs) edges.push({ from, to, weight: params?.[at++] ?? 0, strength: 0 });
      at += 1; // bias
    }
  }
  const strongest = edges.reduce((max, edge) => Math.max(max, Math.abs(edge.weight)), 0) || 1;
  for (const edge of edges) edge.strength = Math.abs(edge.weight) / strongest;
  return edges;
}

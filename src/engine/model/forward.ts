/**
 * The model's answers for many inputs at once, on the calling thread, from a parameter array (a
 * live read or a recorded snapshot). Plain loops over typed arrays, no objects per neuron, so a
 * 48 × 48 decision field of the biggest team repaints well inside a frame (MLP-01). The bends
 * are the autodiff ones (`nn.ts`, `value.ts`); `forward.test.ts` holds the two to the same answers.
 */
import { hiddenActivation, type Activation } from "../autodiff/nn";
import { LEAK } from "../autodiff/value";
import { scoresToOutputs } from "./backends/backend";
import type { ModelSpec } from "./protocol";

export type FieldReader = {
  /** Outputs as the worker's `predict` gives them: chances, shares or values. */
  (params: ArrayLike<number>, inputs: Float32Array): Float32Array;
  /**
   * What every hidden cell says for each input, one array per hidden layer, cell by cell: cell
   * `c` of a layer is `layer.subarray(c * count, (c + 1) * count)`.
   */
  hidden(params: ArrayLike<number>, inputs: Float32Array): Float32Array[];
};

const BENDS: Record<Activation, (value: number) => number> = {
  identity: (value) => value,
  tanh: Math.tanh,
  relu: (value) => (value > 0 ? value : 0),
  leakyRelu: (value) => (value > 0 ? value : value * LEAK),
  sigmoid: (value) => 1 / (1 + Math.exp(-value)),
};

/** A reader for one model shape. */
export function createFieldReader(model: ModelSpec): FieldReader {
  const { sizes } = model;
  const width = sizes[0] ?? 0;
  const layers = sizes.length - 1;
  const outputs = sizes.at(-1) ?? 1;
  const bends = sizes
    .slice(1)
    .map(
      (_, index) =>
        BENDS[index === layers - 1 ? "identity" : hiddenActivation(model.activation, index)],
    );
  const widest = Math.max(...sizes);
  // Two buffers taking turns as a layer's inputs and outputs: nothing is allocated per spot.
  const buffers = [new Float64Array(widest), new Float64Array(widest)] as const;
  let answer = buffers[0];

  /** Runs one input through, calling `visit(layer, cell, value)` for every hidden cell. */
  const forward = (
    params: ArrayLike<number>,
    inputs: Float32Array,
    row: number,
    visit?: (layer: number, cell: number, value: number) => void,
  ) => {
    let values = buffers[0];
    let next = buffers[1];
    for (let column = 0; column < width; column += 1)
      values[column] = inputs[row * width + column] ?? 0;
    let at = 0;
    for (let layer = 0; layer < layers; layer += 1) {
      const fanIn = sizes[layer] ?? 0;
      const size = sizes[layer + 1] ?? 0;
      const bend = bends[layer] ?? BENDS.identity;
      const hidden = visit && layer < layers - 1;
      for (let cell = 0; cell < size; cell += 1) {
        let sum = 0;
        for (let input = 0; input < fanIn; input += 1)
          sum += (params[at + input] ?? 0) * (values[input] ?? 0);
        at += fanIn;
        const value = bend(sum + (params[at] ?? 0));
        at += 1;
        next[cell] = value;
        if (hidden) visit(layer, cell, value);
      }
      [values, next] = [next, values];
    }
    answer = values;
  };

  const read = (params: ArrayLike<number>, inputs: Float32Array) => {
    const count = Math.floor(inputs.length / width);
    const scores = new Float32Array(count * outputs);
    for (let row = 0; row < count; row += 1) {
      forward(params, inputs, row);
      for (let out = 0; out < outputs; out += 1) scores[row * outputs + out] = answer[out] ?? 0;
    }
    return scoresToOutputs(scores, model);
  };

  const hidden = (params: ArrayLike<number>, inputs: Float32Array) => {
    const count = Math.floor(inputs.length / width);
    const out = sizes.slice(1, -1).map((size) => new Float32Array(size * count));
    for (let row = 0; row < count; row += 1)
      forward(params, inputs, row, (layer, cell, value) => {
        const target = out[layer];
        if (target) target[cell * count + row] = value;
      });
    return out;
  };

  return Object.assign(read, { hidden });
}

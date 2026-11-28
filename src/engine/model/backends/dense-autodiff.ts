/**
 * Practice for the yes/no networks a lesson shows, on plain arrays: every sum, slope and rounding
 * in the same order as the `Value` graph of `nn.ts` would do it, so a run gives exactly the same
 * numbers, bit for bit, without building (and throwing away) a node for every one of them.
 * `dense-autodiff.test.ts` holds it to the graph. One raw score out, binary cross-entropy.
 */
import { hiddenActivation, type Activation, type Activations } from "../../autodiff/nn";
import type { Param } from "../../autodiff/optimisers";
import { LEAK } from "../../autodiff/value";
import type { Samples } from "../protocol";

const BEND: Record<Activation, (value: number) => number> = {
  identity: (value) => value,
  relu: (value) => Math.max(0, value),
  leakyRelu: (value) => value * (value > 0 ? 1 : LEAK),
  tanh: (value) => Math.tanh(value),
  sigmoid: (value) => 1 / (1 + Math.exp(-value)),
};

/** Each bend's slope from its input and output, written as `Value` writes it (so it rounds alike). */
const SLOPE: Record<Activation, (input: number, output: number) => number> = {
  identity: () => 1,
  relu: (input) => (input > 0 ? 1 : 0),
  leakyRelu: (input) => (input > 0 ? 1 : LEAK),
  tanh: (_, output) => 1 - output ** 2,
  sigmoid: (_, output) => output * (1 - output),
};

type Shape = { sizes: readonly number[]; activation: Activations };

/** Adds up, into the parameters' grads, the slopes of a batch's mean mistake; returns the mistake. */
export function createDenseLearner({ sizes, activation }: Shape, params: readonly Param[]) {
  const layers = sizes.length - 1;
  const bends = Array.from({ length: layers }, (_, layer) =>
    layer === layers - 1 ? "identity" : hiddenActivation(activation, layer),
  );
  const start: number[] = [];
  let count = 0;
  for (let layer = 0; layer < layers; layer += 1) {
    start.push(count);
    count += (sizes[layer + 1] ?? 0) * ((sizes[layer] ?? 0) + 1);
  }
  const values = new Float64Array(count);
  const grads = new Float64Array(count);
  /** Per layer: the sums, what they say after the bend, and the slope that reached each. */
  const totals = sizes.map((size) => new Float64Array(size));
  const outs = sizes.map((size) => new Float64Array(size));
  const slopes = sizes.map((size) => new Float64Array(size));

  const forward = (inputs: Float32Array, row: number): number => {
    const width = sizes[0] ?? 0;
    const first = outs[0] as Float64Array;
    for (let at = 0; at < width; at += 1) first[at] = inputs[row * width + at] as number;
    for (let layer = 0; layer < layers; layer += 1) {
      const from = outs[layer] as Float64Array;
      const sum = totals[layer + 1] as Float64Array;
      const out = outs[layer + 1] as Float64Array;
      const bend = BEND[bends[layer] as Activation];
      let at = start[layer] as number;
      for (let cell = 0; cell < out.length; cell += 1) {
        let total = 0;
        for (let input = 0; input < from.length; input += 1) {
          total += (values[at] as number) * (from[input] as number);
          at += 1;
        }
        total += values[at] as number;
        at += 1;
        sum[cell] = total;
        out[cell] = bend(total);
      }
    }
    return (outs[layers] as Float64Array)[0] as number;
  };

  const backward = (slope: number) => {
    for (let layer = 1; layer < layers; layer += 1) (slopes[layer] as Float64Array).fill(0);
    (slopes[layers] as Float64Array)[0] = slope;
    for (let layer = layers - 1; layer >= 0; layer -= 1) {
      const from = outs[layer] as Float64Array;
      const sum = totals[layer + 1] as Float64Array;
      const out = outs[layer + 1] as Float64Array;
      const reached = slopes[layer + 1] as Float64Array;
      const back = layer > 0 ? (slopes[layer] as Float64Array) : null;
      const bend = bends[layer] as Activation;
      const steep = SLOPE[bend];
      let at = start[layer] as number;
      for (let cell = 0; cell < out.length; cell += 1) {
        const through = reached[cell] as number;
        const here =
          bend === "identity" ? through : steep(sum[cell] as number, out[cell] as number) * through;
        const bias = at + from.length;
        grads[bias] = (grads[bias] as number) + here;
        for (let input = 0; input < from.length; input += 1) {
          grads[at] = (grads[at] as number) + (from[input] as number) * here;
          if (back) back[input] = (back[input] as number) + (values[at] as number) * here;
          at += 1;
        }
        at += 1;
      }
    }
  };

  return (data: Samples, batch: readonly number[]): number => {
    for (let at = 0; at < count; at += 1) values[at] = params[at]?.data ?? 0;
    grads.fill(0);
    const share = 1 / batch.length;
    let mistakes = 0;
    for (const row of batch) {
      const target = data.targets[row] ?? 0;
      const score = forward(data.inputs, row);
      const positive = score >= 0;
      const tail = Math.exp(positive ? score * -1 : score);
      mistakes += (positive ? score : 0) + score * target * -1 + Math.log(tail + 1);
      // The score's slope, its three parts added in the order the graph reaches them.
      const soft = tail * ((1 / (tail + 1)) * share);
      const direct = positive ? share : 0;
      backward(direct + target * (-1 * share) + (positive ? -1 * soft : soft));
    }
    for (let at = 0; at < count; at += 1) {
      const param = params[at];
      if (param) param.grad = grads[at] as number;
    }
    return mistakes * share;
  };
}

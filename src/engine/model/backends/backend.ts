import type { OptimiserSettings } from "../../autodiff/optimisers";
import type { LossKind, ModelSpec, Samples } from "../protocol";

/** What the trainer needs from a model implementation. Parameters use the autodiff MLP order. */
export type Backend = {
  readonly name: string;
  /** One pass over the data in `order` (indices into samples), batch by batch; mean batch loss. */
  trainEpoch(data: Samples, order: readonly number[], batchSize: number): Promise<number>;
  /** Raw last-layer scores, `count × outputs`. */
  scores(inputs: Float32Array, count: number): Promise<Float32Array>;
  readParameters(): Promise<Float64Array>;
  writeParameters(values: Float64Array): Promise<void>;
  /** New optimiser settings; the same kind keeps its memory (momentum, Adam's averages). */
  configure(optimiser: OptimiserSettings): void | Promise<void>;
  dispose(): void;
};

/** Weights plus biases, in the autodiff order: layer by layer, neuron by neuron, weights then bias. */
export function parameterCount(sizes: readonly number[]): number {
  return sizes.slice(1).reduce((total, size, index) => total + ((sizes[index] ?? 0) + 1) * size, 0);
}

/** Turns raw scores into what people read: yes/no chances, class shares, or the values as they are. */
export function scoresToOutputs(scores: Float32Array, model: ModelSpec): Float32Array {
  const width = model.sizes.at(-1) ?? 1;
  const loss: LossKind = model.loss;
  if (loss === "meanSquared") return scores;
  if (loss === "binaryCrossEntropy") return scores.map((score) => 1 / (1 + Math.exp(-score)));
  const out = new Float32Array(scores.length);
  for (let row = 0; row < scores.length; row += width) {
    const slice = scores.subarray(row, row + width);
    const max = Math.max(...slice);
    let total = 0;
    for (let column = 0; column < width; column += 1) {
      out[row + column] = Math.exp((slice[column] ?? 0) - max);
      total += out[row + column] ?? 0;
    }
    for (let column = row; column < row + width; column += 1)
      out[column] = (out[column] ?? 0) / total;
  }
  return out;
}

/**
 * The mean mistake over every sample, from raw scores, with the same formulas the backends
 * train on (binary cross-entropy from logits, softmax cross-entropy, mean squared). 0 for no data.
 */
export function meanLoss(scores: Float32Array, data: Samples, model: ModelSpec): number {
  const width = model.sizes.at(-1) ?? 1;
  if (data.count === 0) return 0;
  let total = 0;
  for (let row = 0; row < data.count; row += 1) {
    const at = row * width;
    if (model.loss === "binaryCrossEntropy") {
      const z = scores[at] ?? 0;
      const y = data.targets[at] ?? 0;
      total += Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z)));
    } else if (model.loss === "softmaxCrossEntropy") {
      const slice = scores.subarray(at, at + width);
      const max = Math.max(...slice);
      const sum = slice.reduce((acc, score) => acc + Math.exp(score - max), 0);
      total += Math.log(sum) + max - (slice[data.targets[row] ?? 0] ?? 0);
    } else {
      let squares = 0;
      for (let column = 0; column < width; column += 1)
        squares += ((scores[at + column] ?? 0) - (data.targets[at + column] ?? 0)) ** 2;
      total += squares / width;
    }
  }
  return total / data.count;
}

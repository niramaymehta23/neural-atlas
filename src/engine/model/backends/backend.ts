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
  configure(optimiser: OptimiserSettings): void;
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

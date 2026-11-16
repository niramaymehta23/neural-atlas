/**
 * The model's answers for many inputs at once, on the calling thread, from a parameter array (a
 * live read or a recorded snapshot). Cheap enough to repaint a decision field on every new epoch
 * without a round-trip to the worker. Reuses the autodiff MLP, so the formulas keep one home.
 */
import { MLP, writeParameters } from "../autodiff/nn";
import { createRandom } from "../random";
import { scoresToOutputs } from "./backends/backend";
import type { ModelSpec } from "./protocol";

export type FieldReader = (params: ArrayLike<number>, inputs: Float32Array) => Float32Array;

/** A reader for one model shape: outputs as the worker's `predict` gives them. */
export function createFieldReader(model: ModelSpec): FieldReader {
  const mlp = new MLP({ sizes: model.sizes, activation: model.activation }, createRandom(0));
  const parameters = mlp.parameters();
  const width = model.sizes[0] ?? 0;
  const outputs = model.sizes.at(-1) ?? 1;
  return (params, inputs) => {
    writeParameters(parameters, params);
    const count = Math.floor(inputs.length / width);
    const scores = new Float32Array(count * outputs);
    const row: number[] = new Array<number>(width).fill(0);
    for (let index = 0; index < count; index += 1) {
      for (let column = 0; column < width; column += 1)
        row[column] = inputs[index * width + column] ?? 0;
      scores.set(mlp.predict(row), index * outputs);
    }
    return scoresToOutputs(scores, model);
  };
}

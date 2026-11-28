import { binaryCrossEntropy, mean, meanSquared, softmaxCrossEntropy } from "../../autodiff/losses";
import { MLP, readParameters, writeParameters } from "../../autodiff/nn";
import { createOptimiser, zeroGrad } from "../../autodiff/optimisers";
import type { Value } from "../../autodiff/value";
import type { Random } from "../../random";
import type { ModelSpec, Samples, TrainSettings } from "../protocol";
import type { Backend } from "./backend";
import { createDenseLearner } from "./dense-autodiff";

/**
 * The transparent backend: a scalar-autodiff MLP, for small nets where every weight is shown. A
 * yes/no network with one answer learns on plain arrays instead, with exactly the same numbers.
 */
export function createAutodiffBackend(
  model: ModelSpec,
  train: TrainSettings,
  random: Random,
): Backend {
  const mlp = new MLP({ sizes: model.sizes, activation: model.activation }, random);
  const params = mlp.parameters();
  const inputWidth = model.sizes[0] ?? 0;
  const outputWidth = model.sizes.at(-1) ?? 1;
  let optimiser = createOptimiser(train.optimiser);

  const learn =
    model.loss === "binaryCrossEntropy" && outputWidth === 1
      ? createDenseLearner(model, params)
      : null;

  const exampleLoss = (outputs: Value[], data: Samples, index: number): Value => {
    if (model.loss === "softmaxCrossEntropy")
      return softmaxCrossEntropy(outputs, data.targets[index] ?? 0);
    const targets = Array.from(
      data.targets.subarray(index * outputWidth, (index + 1) * outputWidth),
    );
    return model.loss === "binaryCrossEntropy"
      ? binaryCrossEntropy(outputs[0] as Value, targets[0] ?? 0)
      : meanSquared(outputs, targets);
  };
  const row = (inputs: Float32Array, index: number) =>
    Array.from(inputs.subarray(index * inputWidth, (index + 1) * inputWidth));

  /** Fills the parameters' grads for one batch; returns its mean mistake. */
  const learnFrom = (data: Samples, batch: readonly number[]): number => {
    if (learn) return learn(data, batch);
    const loss = mean(
      batch.map((index) => exampleLoss(mlp.call(row(data.inputs, index)), data, index)),
    );
    zeroGrad(params);
    loss.backward();
    return loss.data;
  };

  return {
    name: "autodiff",
    async trainEpoch(data, order, batchSize) {
      let total = 0;
      let batches = 0;
      for (let start = 0; start < order.length; start += batchSize) {
        total += learnFrom(data, order.slice(start, start + batchSize));
        optimiser.step(params);
        batches += 1;
      }
      return batches === 0 ? 0 : total / batches;
    },
    async scores(inputs, count) {
      const out = new Float32Array(count * outputWidth);
      for (let index = 0; index < count; index += 1)
        out.set(mlp.predict(row(inputs, index)), index * outputWidth);
      return out;
    },
    async readParameters() {
      return readParameters(params);
    },
    async writeParameters(values) {
      writeParameters(params, values);
    },
    configure(settings) {
      // Same kind keeps its memory (momentum, Adam's averages); a new kind starts fresh.
      if (settings.kind === optimiser.settings.kind) optimiser.settings = settings;
      else optimiser = createOptimiser(settings);
    },
    dispose() {},
  };
}

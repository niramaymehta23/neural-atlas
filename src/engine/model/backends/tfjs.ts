/**
 * The bigger-model backend: TensorFlow.js on WebGPU, falling back to WebGL, then plain CPU
 * (headless machines). Loaded only when asked for, so the autodiff path never pays for it.
 * Parameters are converted to the autodiff order, so every visual reads both backends alike.
 */
import * as tf from "@tensorflow/tfjs";
import type { OptimiserSettings } from "../../autodiff/optimisers";
import { LEAK } from "../../autodiff/value";
import type { ModelSpec, TrainSettings } from "../protocol";
import type { Backend } from "./backend";

const PREFERENCE = ["webgpu", "webgl", "cpu"] as const;

async function pickDevice(): Promise<string> {
  try {
    await import("@tensorflow/tfjs-backend-webgpu");
  } catch {
    // No WebGPU build for this environment; WebGL and CPU remain.
  }
  for (const name of PREFERENCE) {
    try {
      if (await tf.setBackend(name)) {
        await tf.ready();
        return name;
      }
    } catch {
      // This device is missing here; try the next one.
    }
  }
  throw new Error("No way to run TensorFlow.js here.");
}

function optimiserFor({ kind, learningRate, momentum = 0.9, beta1, beta2 }: OptimiserSettings) {
  if (kind === "sgd") return tf.train.sgd(learningRate);
  if (kind === "momentum") return tf.train.momentum(learningRate, momentum);
  return tf.train.adam(learningRate, beta1, beta2);
}

export async function createTfjsBackend(spec: ModelSpec, train: TrainSettings): Promise<Backend> {
  const device = await pickDevice();
  const { sizes, activation, loss } = spec;
  const inputWidth = sizes[0] ?? 1;
  const outputWidth = sizes.at(-1) ?? 1;

  const model = tf.sequential();
  sizes.slice(1).forEach((units, index) => {
    const hidden = index < sizes.length - 2;
    model.add(
      tf.layers.dense({
        units,
        inputShape: index === 0 ? [inputWidth] : undefined,
        // No activation means none: the output layer gives raw scores, leaky relu is its own layer.
        activation:
          hidden && activation !== "leakyRelu" && activation !== "identity"
            ? activation
            : undefined,
        kernelInitializer: tf.initializers.glorotUniform({ seed: train.seed + index }),
      }),
    );
    if (hidden && activation === "leakyRelu") model.add(tf.layers.leakyReLU({ alpha: LEAK }));
  });
  const dense = model.layers.filter((layer) => layer.getClassName() === "Dense");
  let optimiser = optimiserFor(train.optimiser);
  let kind = train.optimiser.kind;

  const lossOf = (scores: tf.Tensor, targets: tf.Tensor) =>
    loss === "softmaxCrossEntropy"
      ? tf.losses.softmaxCrossEntropy(tf.oneHot(targets.toInt(), outputWidth), scores)
      : loss === "binaryCrossEntropy"
        ? tf.losses.sigmoidCrossEntropy(targets, scores)
        : tf.losses.meanSquaredError(targets, scores);

  return {
    name: `tfjs-${device}`,
    async trainEpoch(data, order, batchSize) {
      const targetWidth = loss === "softmaxCrossEntropy" ? 1 : outputWidth;
      const gather = (source: Float32Array, width: number, batch: readonly number[]) => {
        const out = new Float32Array(batch.length * width);
        batch.forEach((index, row) =>
          out.set(source.subarray(index * width, (index + 1) * width), row * width),
        );
        return out;
      };
      let total = 0;
      let batches = 0;
      for (let start = 0; start < order.length; start += batchSize) {
        const batch = order.slice(start, start + batchSize);
        const inputs = tf.tensor2d(gather(data.inputs, inputWidth, batch), [
          batch.length,
          inputWidth,
        ]);
        const targets =
          loss === "softmaxCrossEntropy"
            ? tf.tensor1d(gather(data.targets, 1, batch))
            : tf.tensor2d(gather(data.targets, targetWidth, batch), [batch.length, targetWidth]);
        const cost = optimiser.minimize(
          () => lossOf(model.apply(inputs) as tf.Tensor, targets) as tf.Scalar,
          true,
        );
        total += cost ? ((await cost.data())[0] ?? 0) : 0;
        tf.dispose([inputs, targets, cost ?? []]);
        batches += 1;
      }
      return batches === 0 ? 0 : total / batches;
    },
    async scores(inputs, count) {
      const out = tf.tidy(
        () => model.predict(tf.tensor2d(inputs, [count, inputWidth])) as tf.Tensor,
      );
      const values = (await out.data()) as Float32Array;
      out.dispose();
      return values;
    },
    async readParameters() {
      const out: number[] = [];
      for (const layer of dense) {
        const [kernel, bias] = layer.getWeights();
        const [rows = 0, columns = 0] = kernel?.shape ?? [];
        const weights = (await kernel?.data()) ?? new Float32Array();
        const biases = (await bias?.data()) ?? new Float32Array();
        for (let neuron = 0; neuron < columns; neuron += 1) {
          for (let input = 0; input < rows; input += 1)
            out.push(weights[input * columns + neuron] ?? 0);
          out.push(biases[neuron] ?? 0);
        }
      }
      return Float64Array.from(out);
    },
    async writeParameters(values) {
      let at = 0;
      for (const layer of dense) {
        const [kernel] = layer.getWeights();
        const [rows = 0, columns = 0] = kernel?.shape ?? [];
        const weights = new Float32Array(rows * columns);
        const biases = new Float32Array(columns);
        for (let neuron = 0; neuron < columns; neuron += 1) {
          for (let input = 0; input < rows; input += 1)
            weights[input * columns + neuron] = values[at++] ?? 0;
          biases[neuron] = values[at++] ?? 0;
        }
        tf.tidy(() =>
          layer.setWeights([tf.tensor2d(weights, [rows, columns]), tf.tensor1d(biases)]),
        );
      }
    },
    configure(settings) {
      // Like the autodiff backend: the same kind keeps its memory, a new kind starts fresh.
      if (settings.kind === kind) {
        if (optimiser instanceof tf.SGDOptimizer) optimiser.setLearningRate(settings.learningRate);
        // Adam has no setter; its step size is a plain field read on every update.
        else Object.assign(optimiser, { learningRate: settings.learningRate });
        if (optimiser instanceof tf.MomentumOptimizer)
          optimiser.setMomentum(settings.momentum ?? 0.9);
        return;
      }
      optimiser.dispose();
      optimiser = optimiserFor(settings);
      kind = settings.kind;
    },
    dispose() {
      optimiser.dispose();
      model.dispose();
    },
  };
}

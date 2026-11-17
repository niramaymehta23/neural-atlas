/**
 * The bigger-model backend: TensorFlow.js on WebGPU, falling back to WebGL, then plain CPU
 * (headless machines). Loaded only when asked for, so the autodiff path never pays for it.
 * Parameters are converted to the autodiff order, so every visual reads both backends alike.
 *
 * The graphics card is asked for numbers as rarely as possible: an epoch's mistakes are added up
 * on the card and read once, and the trainer reads parameters at most once a frame (ENG-11).
 */
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import * as tfl from "@tensorflow/tfjs-layers";
import { hiddenActivation } from "../../autodiff/nn";
import type { OptimiserSettings } from "../../autodiff/optimisers";
import { LEAK } from "../../autodiff/value";
import type { ModelSpec, TrainSettings } from "../protocol";
import type { Backend } from "./backend";

const PREFERENCE = ["webgpu", "webgl", "cpu"] as const;
export type Device = (typeof PREFERENCE)[number];

/** Calls `onLost` once if the graphics device under `device` goes away (a WebGPU device can). */
export type WatchDevice = (device: Device, onLost: () => void) => void;

const watchWebGpu: WatchDevice = (device, onLost) => {
  if (device !== "webgpu") return;
  const backend = tf.backend() as { device?: { lost?: Promise<unknown> } };
  void backend.device?.lost?.then(onLost);
};

async function pickDevice(devices: readonly Device[]): Promise<Device> {
  if (devices.includes("webgpu")) {
    try {
      await import("@tensorflow/tfjs-backend-webgpu");
    } catch {
      // No WebGPU build for this environment; WebGL and CPU remain.
    }
  }
  for (const name of devices) {
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

type Activation = ReturnType<typeof hiddenActivation>;
type LayersActivation = "tanh" | "relu" | "sigmoid" | undefined;

/** The layers activation for a hidden bend; leaky relu is its own layer, identity is none. */
const layersActivation = (bend: Activation): LayersActivation =>
  bend === "leakyRelu" || bend === "identity" ? undefined : bend;

function buildModel({ sizes, activation }: ModelSpec, seed: number) {
  const model = tfl.sequential();
  sizes.slice(1).forEach((units, index) => {
    const hidden = index < sizes.length - 2;
    const bend = hidden ? hiddenActivation(activation, index) : "identity";
    model.add(
      tfl.layers.dense({
        units,
        inputShape: index === 0 ? [sizes[0] ?? 1] : undefined,
        // No activation means none: the output layer gives raw scores.
        activation: layersActivation(bend),
        kernelInitializer: tfl.initializers.glorotUniform({ seed: seed + index }),
      }),
    );
    if (bend === "leakyRelu") model.add(tfl.layers.leakyReLU({ alpha: LEAK }));
  });
  return model;
}

export async function createTfjsBackend(
  spec: ModelSpec,
  train: TrainSettings,
  devices: readonly Device[] = PREFERENCE,
  watch: WatchDevice = watchWebGpu,
): Promise<Backend> {
  let device = await pickDevice(devices);
  const { sizes, loss } = spec;
  const inputWidth = sizes[0] ?? 1;
  const outputWidth = sizes.at(-1) ?? 1;
  let settings = train.optimiser;
  let model = buildModel(spec, train.seed);
  let optimiser = optimiserFor(settings);
  /** The newest parameters read or written, to carry over to another device. */
  let kept: Float64Array | null = null;
  let lost = false;

  const dense = () => model.layers.filter((layer) => layer.getClassName() === "Dense");
  const onLost = () => {
    lost = true;
  };
  watch(device, onLost);

  const readParameters = async () => {
    const out: number[] = [];
    for (const layer of dense()) {
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
    kept = Float64Array.from(out);
    return kept.slice();
  };

  const writeParameters = async (values: Float64Array) => {
    let at = 0;
    for (const layer of dense()) {
      const [kernel] = layer.getWeights();
      const [rows = 0, columns = 0] = kernel?.shape ?? [];
      const weights = new Float32Array(rows * columns);
      const biases = new Float32Array(columns);
      for (let neuron = 0; neuron < columns; neuron += 1) {
        for (let input = 0; input < rows; input += 1)
          weights[input * columns + neuron] = values[at++] ?? 0;
        biases[neuron] = values[at++] ?? 0;
      }
      tf.tidy(() => layer.setWeights([tf.tensor2d(weights, [rows, columns]), tf.tensor1d(biases)]));
    }
    kept = values.slice();
  };

  /**
   * The graphics device went away: carry on with WebGL (or the CPU) from the newest parameters
   * read. The optimiser starts afresh there; its memory lived on the lost device.
   */
  const recover = async () => {
    lost = false;
    const remaining = PREFERENCE.slice(PREFERENCE.indexOf(device) + 1).filter((name) =>
      devices.includes(name),
    );
    device = await pickDevice(remaining.length > 0 ? remaining : ["cpu"]);
    model = buildModel(spec, train.seed);
    optimiser = optimiserFor(settings);
    if (kept) await writeParameters(kept);
    watch(device, onLost);
  };

  const lossOf = (scores: tf.Tensor, targets: tf.Tensor) =>
    loss === "softmaxCrossEntropy"
      ? tf.losses.softmaxCrossEntropy(
          tf.oneHot(tf.cast(targets, "int32") as tf.Tensor1D, outputWidth),
          scores,
        )
      : loss === "binaryCrossEntropy"
        ? tf.losses.sigmoidCrossEntropy(targets, scores)
        : tf.losses.meanSquaredError(targets, scores);

  const gather = (source: Float32Array, width: number, batch: readonly number[]) => {
    const out = new Float32Array(batch.length * width);
    batch.forEach((index, row) =>
      out.set(source.subarray(index * width, (index + 1) * width), row * width),
    );
    return out;
  };

  const trainEpoch: Backend["trainEpoch"] = async (data, order, batchSize) => {
    if (lost) await recover();
    const targetWidth = loss === "softmaxCrossEntropy" ? 1 : outputWidth;
    // The epoch's mistakes are summed on the device and read once, at the end.
    let total: tf.Scalar = tf.scalar(0);
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
      if (cost) {
        const sum: tf.Scalar = tf.add(total, cost);
        tf.dispose([total, cost]);
        total = sum;
      }
      tf.dispose([inputs, targets]);
      batches += 1;
    }
    const sum = (await total.data())[0] ?? 0;
    total.dispose();
    return batches === 0 ? 0 : sum / batches;
  };

  return {
    get name() {
      return `tfjs-${device}`;
    },
    async trainEpoch(data, order, batchSize) {
      try {
        return await trainEpoch(data, order, batchSize);
      } catch (error) {
        // A device lost mid-epoch: redo the epoch on the next device.
        if (!lost) throw error;
        return trainEpoch(data, order, batchSize);
      }
    },
    async scores(inputs, count) {
      if (lost) await recover();
      const out = tf.tidy(
        () => model.predict(tf.tensor2d(inputs, [count, inputWidth])) as tf.Tensor,
      ) as tf.Tensor;
      const values = (await out.data()) as Float32Array;
      out.dispose();
      return values;
    },
    readParameters,
    writeParameters,
    async configure(next) {
      // Like the autodiff backend: the same kind keeps its memory, a new kind starts fresh.
      const previous = settings;
      settings = next;
      // By kind, not instanceof: TensorFlow.js optimisers answer instanceof by duck typing.
      if (next.kind === previous.kind && next.kind !== "adam") {
        const stepper = optimiser as tf.SGDOptimizer;
        stepper.setLearningRate(next.learningRate);
        if (next.kind === "momentum")
          (optimiser as tf.MomentumOptimizer).setMomentum(next.momentum ?? 0.9);
        return;
      }
      const fresh = optimiserFor(next);
      if (next.kind === previous.kind) {
        // Adam has no setter for its step size: a new one takes over the old one's averages.
        const [iterations, ...averages] = await optimiser.getWeights();
        if (iterations) await fresh.setWeights([iterations, ...averages]);
        iterations?.tensor.dispose();
      }
      optimiser.dispose();
      optimiser = fresh;
    },
    dispose() {
      optimiser.dispose();
      model.dispose();
    },
  };
}

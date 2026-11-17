/**
 * The bigger-model backend: TensorFlow.js on WebGPU, falling back to WebGL, then plain CPU
 * (headless machines). Loaded only when asked for, so the autodiff path never pays for it.
 * Parameters are converted to the autodiff order, so every visual reads both backends alike.
 *
 * The graphics card is asked for numbers as rarely as possible: an epoch's mistakes are added up
 * on the card and read once, and the trainer reads parameters at most once a frame (ENG-11).
 *
 * WebGL checks each new shader program synchronously, which blocks the whole worker until the
 * graphics process has compiled it: on a busy machine that took longer than 30 s, with the
 * worker frozen meanwhile. So the model's programs are compiled ahead, without waiting on each
 * (compile-only mode and the parallel-compile extension), and a device that cannot get them
 * ready within GPU_READY_MS is passed over for the next one (the CPU is quick for these models).
 * A device that turns slow later (SLOW_READS reads in a row each over SLOW_READ_MS, as when
 * other programs swamp the graphics card) is left the same way a lost device is.
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

/** How long a device may take to get the model's shader programs ready before it is passed over. */
export const GPU_READY_MS = 5_000;
/** A read from the device slower than this counts as slow (a free device answers in ~20 ms). */
export const SLOW_READ_MS = 1_000;
/** This many slow reads in a row and training moves to the next device. */
export const SLOW_READS = 3;

/** Takes each read's time in ms; true once SLOW_READS reads in a row were slow. */
export function slowDeviceWatch() {
  let inARow = 0;
  return {
    took(ms: number) {
      inARow = ms > SLOW_READ_MS ? inARow + 1 : 0;
      return inARow >= SLOW_READS;
    },
    reset() {
      inARow = 0;
    },
  };
}

/** Gets `device` ready to run the model; false when it cannot be ready in time. */
export type PrepareDevice = (device: Device) => Promise<boolean>;

/** Resolves to the promise's value, or to `fallback` once `ms` have passed. */
export function within<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/** Calls `onLost` once if the graphics device under `device` goes away (a WebGPU device can). */
export type WatchDevice = (device: Device, onLost: () => void) => void;

const watchWebGpu: WatchDevice = (device, onLost) => {
  if (device !== "webgpu") return;
  const backend = tf.backend() as { device?: { lost?: Promise<unknown> } };
  void backend.device?.lost?.then(onLost);
};

/**
 * The first device in `devices` that starts and gets ready in time. Exported for its tests.
 */
export async function pickDevice(
  devices: readonly Device[],
  prepare: PrepareDevice,
  readyMs = GPU_READY_MS,
): Promise<Device> {
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
        if (await within(prepare(name), readyMs, false)) return name;
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

/** The model's mistake for a batch, as one number on the device. */
function lossFor(loss: ModelSpec["loss"], outputWidth: number) {
  return (scores: tf.Tensor, targets: tf.Tensor) =>
    loss === "softmaxCrossEntropy"
      ? tf.losses.softmaxCrossEntropy(
          tf.oneHot(tf.cast(targets, "int32") as tf.Tensor1D, outputWidth),
          scores,
        )
      : loss === "binaryCrossEntropy"
        ? tf.losses.sigmoidCrossEntropy(targets, scores)
        : tf.losses.meanSquaredError(targets, scores);
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

/** What the WebGL backend offers for compiling programs without waiting on each one. */
type ParallelCompile = {
  checkCompileCompletionAsync(): Promise<boolean[]>;
  getUniformLocations(): void;
};

/** Row counts the programs are compiled for: one, a few, a batch, and a big field of spots. */
const AHEAD_ROWS = [1, 7, 1000];

/**
 * Compiles every shader program the model's predictions and training steps need, on a
 * throwaway copy, without blocking on any of them; resolves once they are all ready.
 */
async function compileAhead(spec: ModelSpec, train: TrainSettings): Promise<boolean> {
  const backend = tf.backend() as unknown as Partial<ParallelCompile>;
  if (!backend.checkCompileCompletionAsync || !backend.getUniformLocations) return true;
  // Programs that take their shapes as inputs serve every batch and field size alike.
  tf.env().set("WEBGL_USE_SHAPES_UNIFORMS", true);
  const width = spec.sizes[0] ?? 1;
  const outputs = spec.sizes.at(-1) ?? 1;
  const lossOf = lossFor(spec.loss, outputs);
  const model = buildModel(spec, train.seed);
  const optimiser = optimiserFor(train.optimiser);
  const flags = tf.env().getFlags();
  const saved = { compileOnly: flags.ENGINE_COMPILE_ONLY, cpuForward: flags.WEBGL_CPU_FORWARD };
  try {
    // Nothing runs: programs are only compiled. Every op goes to the device, so all are covered.
    tf.env().set("ENGINE_COMPILE_ONLY", true);
    tf.env().set("WEBGL_CPU_FORWARD", false);
    for (const rows of [...AHEAD_ROWS, train.batchSize]) {
      tf.tidy(() => {
        const inputs = tf.zeros([rows, width]);
        const targets =
          spec.loss === "softmaxCrossEntropy" ? tf.zeros([rows]) : tf.zeros([rows, outputs]);
        model.predict(inputs);
        optimiser.minimize(() => lossOf(model.apply(inputs) as tf.Tensor, targets) as tf.Scalar);
        // The epoch's running total of mistakes.
        tf.add(tf.scalar(0), tf.scalar(0));
      });
    }
  } finally {
    tf.env().set("ENGINE_COMPILE_ONLY", saved.compileOnly ?? false);
    tf.env().set("WEBGL_CPU_FORWARD", saved.cpuForward ?? true);
    optimiser.dispose();
    model.dispose();
  }
  await backend.checkCompileCompletionAsync();
  backend.getUniformLocations();
  // One real answer, read back: the device must be able to reply, not only compile.
  const probe = buildModel(spec, train.seed);
  const answer = tf.tidy(() => probe.predict(tf.zeros([1, width])) as tf.Tensor);
  await answer.data();
  answer.dispose();
  probe.dispose();
  return true;
}

export async function createTfjsBackend(
  spec: ModelSpec,
  train: TrainSettings,
  devices: readonly Device[] = PREFERENCE,
  watch: WatchDevice = watchWebGpu,
  prepare: PrepareDevice = (device) =>
    device === "webgl" ? compileAhead(spec, train) : Promise.resolve(true),
): Promise<Backend> {
  let device = await pickDevice(devices, prepare);
  const { sizes, loss } = spec;
  const inputWidth = sizes[0] ?? 1;
  const outputWidth = sizes.at(-1) ?? 1;
  let settings = train.optimiser;
  let model = buildModel(spec, train.seed);
  let optimiser = optimiserFor(settings);
  /** The newest parameters read or written, to carry over to another device. */
  let kept: Float64Array | null = null;
  let lost = false;
  const slow = slowDeviceWatch();

  /** Reads `tensor` from the device, noting whether the device has become too slow to keep. */
  const read = async (tensor: tf.Tensor) => {
    const started = performance.now();
    const values = await tensor.data();
    if (slow.took(performance.now() - started) && device !== "cpu") lost = true;
    return values;
  };

  const dense = () => model.layers.filter((layer) => layer.getClassName() === "Dense");
  const onLost = () => {
    lost = true;
  };
  watch(device, onLost);

  /**
   * Every parameter in one read from the device: each read waits for the device to catch up,
   * which on a busy machine takes most of a second, so one read beats one per weight array.
   */
  const readParameters = async () => {
    const layers = dense().map((layer) => layer.getWeights());
    const all = tf.tidy(() =>
      tf.concat(
        layers.flatMap(([kernel, bias]) =>
          kernel && bias
            ? [tf.reshape(tf.transpose(tf.concat([kernel, tf.expandDims(bias, 0)])), [-1])]
            : [],
        ),
      ),
    );
    const values = await read(all);
    all.dispose();
    // Each layer arrives neuron by neuron: its weights from every input, then its bias.
    kept = Float64Array.from(values);
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
    slow.reset();
    const remaining = PREFERENCE.slice(PREFERENCE.indexOf(device) + 1).filter((name) =>
      devices.includes(name),
    );
    device = await pickDevice(remaining.length > 0 ? remaining : ["cpu"], prepare);
    model = buildModel(spec, train.seed);
    optimiser = optimiserFor(settings);
    if (kept) await writeParameters(kept);
    watch(device, onLost);
  };

  const lossOf = lossFor(loss, outputWidth);

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
    const sum = (await read(total))[0] ?? 0;
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
      const values = (await read(out)) as Float32Array;
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

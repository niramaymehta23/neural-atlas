/**
 * The typed conversation between ModelEngine (main thread) and the single training worker.
 * Commands go in, events come out; both are discriminated unions on `type`.
 */
import type { Activation } from "../autodiff/nn";
import type { OptimiserSettings } from "../autodiff/optimisers";

export type LossKind = "meanSquared" | "binaryCrossEntropy" | "softmaxCrossEntropy";
export type BackendKind = "autodiff" | "tfjs";

export type ModelSpec = {
  /** Neurons per layer, inputs first. */
  sizes: number[];
  /** Bend for hidden layers; the last layer is always identity (raw scores). */
  activation: Activation;
  loss: LossKind;
};

/**
 * Training examples, flat. `inputs` holds `count × sizes[0]` numbers. `targets` holds one class
 * index per example for softmax cross-entropy, otherwise `count × sizes.at(-1)` numbers.
 */
export type Samples = { inputs: Float32Array; targets: Float32Array; count: number };

export type TrainSettings = {
  optimiser: OptimiserSettings;
  batchSize: number;
  seed: number;
  /** Post a snapshot (for the Timeline) every this many epochs. */
  snapshotEvery: number;
};

/** One recorded moment of a run. Parameters are float64 so restoring is exact. */
export type Snapshot = { epoch: number; loss: number; params: Float64Array };

export type Command =
  | {
      type: "init";
      backend: BackendKind;
      model: ModelSpec;
      data: Samples;
      train: TrainSettings;
      /** Shared memory the worker writes the newest parameters into every epoch. */
      live: SharedArrayBuffer;
    }
  | { type: "setData"; data: Samples }
  | { type: "configure"; optimiser: OptimiserSettings }
  | { type: "run" }
  | { type: "pause" }
  | { type: "step"; epochs: number }
  | { type: "restore"; snapshot: Snapshot }
  | { type: "predict"; id: number; inputs: Float32Array };

export type Event =
  /** `backend` names what actually runs: "autodiff", "tfjs-webgpu", "tfjs-webgl" or "tfjs-cpu". */
  | { type: "ready"; backend: string }
  | { type: "snapshot"; snapshot: Snapshot }
  /** Per input: probabilities (one per class, or one for yes/no) or plain values for mean squared. */
  | { type: "prediction"; id: number; outputs: Float32Array }
  | { type: "error"; message: string };

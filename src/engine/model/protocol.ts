/**
 * The typed conversation between a ModelEngine (main thread) and its training worker.
 * Commands go in, events come out; both are discriminated unions on `type`.
 */
import type { Activations } from "../autodiff/nn";
import type { OptimiserSettings } from "../autodiff/optimisers";

export type LossKind = "meanSquared" | "binaryCrossEntropy" | "softmaxCrossEntropy";
export type BackendKind = "autodiff" | "tfjs";

export type ModelSpec = {
  /** Neurons per layer, inputs first. */
  sizes: number[];
  /**
   * Bend for hidden layers: one for all, or one per hidden layer. The last layer is always
   * identity (raw scores).
   */
  activation: Activations;
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
  /** Post a snapshot (for the Timeline) every this many epochs (a whole number, 1 or more). */
  snapshotEvery: number;
  /**
   * While running, at most one snapshot per this many milliseconds (the one at the end of a
   * pause or step is always posted). Omitted: no limit.
   */
  snapshotMs?: number;
  /** While running, at most this many epochs a second, so it can be watched. Omitted: flat out. */
  perSecond?: number;
};

/**
 * A change that happens at a set moment of a replayed run: before epoch `epoch + 1` trains, the
 * data and/or the optimiser settings change. Applying a run's changes at the same epochs gives
 * the same parameters, so a lesson can rebuild a shared run exactly.
 */
export type ScheduledChange = { epoch: number; data?: Samples; optimiser?: OptimiserSettings };

/** One recorded moment of a run. Parameters are float64 so restoring is exact. */
export type Snapshot = { epoch: number; loss: number; params: Float64Array };

export type Command =
  | {
      type: "init";
      backend: BackendKind;
      model: ModelSpec;
      data: Samples;
      train: TrainSettings;
      /**
       * Shared memory the worker writes the newest parameters into every epoch. Null when the
       * page is not cross-origin isolated: the worker then posts `live` copies instead.
       */
      live: SharedArrayBuffer | null;
    }
  /** `tag`, when given, is echoed in an `applied` event naming the epoch it took effect at. */
  | { type: "setData"; data: Samples; tag?: number }
  | { type: "configure"; optimiser: OptimiserSettings; tag?: number }
  | { type: "run" }
  | { type: "pause" }
  /** The page is hidden: training holds still until it is shown again. */
  | { type: "rest"; resting: boolean }
  /** Trains `epochs` more (in short slices), applying `schedule` at its epochs on the way. */
  | { type: "step"; epochs: number; schedule?: readonly ScheduledChange[] }
  | { type: "restore"; snapshot: Snapshot }
  | { type: "predict"; id: number; inputs: Float32Array };

export type Event =
  /** `backend` names what actually runs: "autodiff", "tfjs-webgpu", "tfjs-webgl" or "tfjs-cpu". */
  | { type: "ready"; backend: string }
  | { type: "snapshot"; snapshot: Snapshot }
  /** Per input: probabilities (one per class, or one for yes/no) or plain values for mean squared. */
  | { type: "prediction"; id: number; outputs: Float32Array }
  /** The newest parameters, at most once per ~16 ms, when there is no shared memory. */
  | { type: "live"; epoch: number; loss: number; params: Float64Array }
  /** A tagged `setData` or `configure` took effect before epoch `epoch + 1`. */
  | { type: "applied"; tag: number; epoch: number }
  /** Training stopped by itself: there is nothing to learn from. */
  | { type: "idle"; reason: "no-data" }
  /**
   * The mistakes or parameters stopped being numbers (the steps grew too big): training stopped
   * and the model went back to the last good parameters, those of epoch `epoch`.
   */
  | { type: "diverged"; epoch: number }
  | { type: "error"; message: string };

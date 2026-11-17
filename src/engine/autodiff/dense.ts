/**
 * A small dense network on typed arrays: the same maths as `nn.ts` (same parameter order, same
 * bends, same losses), written as plain loops so a lesson can work out a whole practice run in a
 * few milliseconds and record it. It adds what the World 3 lessons show: calming each layer's
 * signals (layer normalisation without a learned gain), switching cells off while practising
 * (dropout), a step size that changes over the run, and per-layer reports of the blame that
 * reaches each layer and of what each cell says. `dense.test.ts` holds its gradients to `Value`.
 */
import { createRandom, type Random } from "../random";
import type { Activation } from "./nn";
import type { OptimiserKind } from "./optimisers";
import { LEAK } from "./value";

export type DenseSpec = {
  /** Cells per layer, inputs first: [2, 8, 8, 1]. */
  sizes: readonly number[];
  /** The bend of each hidden layer (input side first); the last listed repeats. */
  bends: readonly Activation[];
  /** "squared" scores raw outputs against numbers; "logistic" scores one raw output against 0/1. */
  loss: "squared" | "logistic";
  /** Calm each hidden layer: its cells' totals are re-centred and re-scaled before the bend. */
  calm?: boolean;
  /** Share of hidden cells switched off for each example while practising (0–1). */
  dropout?: number;
};

export type DenseStart = {
  seed: number;
  /** How wild the starting weights are: 1 is the usual 1/√inputs spread. */
  scale?: number;
  /**
   * Every weight in a layer starts at the same number, so every cell in a layer starts as an
   * exact copy of the others (in and out), and practice can never tell them apart.
   */
  same?: boolean;
};

export type DenseData = {
  /** Row after row, `sizes[0]` numbers each. */
  inputs: ArrayLike<number>;
  /** Row after row, `sizes.at(-1)` numbers each. */
  targets: ArrayLike<number>;
};

export type DensePractice = {
  optimiser: OptimiserKind;
  /** How big a step, or one per round (rounds count from 0). */
  learningRate: number | ((round: number) => number);
  momentum?: number;
  /** Examples per step; the whole set by default. */
  batchSize?: number;
  /** Seeds the shuffles and the switched-off cells. */
  seed: number;
};

export type RoundReport = {
  /** Mean mistake over the whole set before this round's steps, with nobody switched off. */
  loss: number;
  /** Per weight layer (input side first): the mean size of the blame its cells received. */
  blame: number[];
};

const BEND: Record<Activation, (value: number) => number> = {
  identity: (value) => value,
  tanh: Math.tanh,
  relu: (value) => (value > 0 ? value : 0),
  leakyRelu: (value) => (value > 0 ? value : value * LEAK),
  sigmoid: (value) => 1 / (1 + Math.exp(-value)),
};

/** The slope of each bend, from its input and its output. */
const SLOPE: Record<Activation, (input: number, output: number) => number> = {
  identity: () => 1,
  tanh: (_, output) => 1 - output * output,
  relu: (input) => (input > 0 ? 1 : 0),
  leakyRelu: (input) => (input > 0 ? 1 : LEAK),
  sigmoid: (_, output) => output * (1 - output),
};

const CALM_EPSILON = 1e-5;
const ADAM = { beta1: 0.9, beta2: 0.999, epsilon: 1e-8 };

export function bendOf(spec: DenseSpec, layer: number): Activation {
  const last = spec.sizes.length - 2;
  if (layer >= last) return "identity";
  return spec.bends[Math.min(layer, spec.bends.length - 1)] ?? "identity";
}

/** How many numbers the network holds: per cell, its weights then its bias. */
export function paramCount(sizes: readonly number[]): number {
  let total = 0;
  for (let layer = 1; layer < sizes.length; layer += 1)
    total += (sizes[layer] ?? 0) * ((sizes[layer - 1] ?? 0) + 1);
  return total;
}

/** Starting weights (normal, 1/√inputs × scale) and zero biases, in the autodiff order. */
export function startParams(sizes: readonly number[], start: DenseStart): Float64Array {
  const random = createRandom(start.seed);
  const params = new Float64Array(paramCount(sizes));
  const scale = start.scale ?? 1;
  let at = 0;
  for (let layer = 1; layer < sizes.length; layer += 1) {
    const fanIn = sizes[layer - 1] ?? 0;
    const spread = scale / Math.sqrt(fanIn || 1);
    // Drawn for every layer, used or not, so the "same" choice never shifts other starts.
    const draws = Array.from({ length: fanIn }, () => random.normal() * spread);
    const shared = Math.abs(draws[0] ?? 0);
    for (let cell = 0; cell < (sizes[layer] ?? 0); cell += 1) {
      for (let input = 0; input < fanIn; input += 1)
        params[at + input] = start.same ? shared : random.normal() * spread;
      at += fanIn + 1;
    }
  }
  return params;
}

/** Re-centres and re-scales `values` in place; returns the spread it divided by. */
function calm(values: Float64Array, size: number): number {
  let mean = 0;
  for (let cell = 0; cell < size; cell += 1) mean += values[cell] ?? 0;
  mean /= size;
  let variance = 0;
  for (let cell = 0; cell < size; cell += 1) variance += ((values[cell] ?? 0) - mean) ** 2;
  const spread = Math.sqrt(variance / size + CALM_EPSILON);
  for (let cell = 0; cell < size; cell += 1) values[cell] = ((values[cell] ?? 0) - mean) / spread;
  return spread;
}

/**
 * Buffers for one example: per layer, the totals before calming, after calming, and what each
 * cell says (after the bend and any switch-off).
 */
type Pass = { totals: Float64Array[]; calmed: Float64Array[]; outs: Float64Array[] };

function makePass(sizes: readonly number[]): Pass {
  const layers = sizes.slice(1);
  return {
    totals: layers.map((size) => new Float64Array(size)),
    calmed: layers.map((size) => new Float64Array(size)),
    outs: layers.map((size) => new Float64Array(size)),
  };
}

const calmsLayer = (spec: DenseSpec, layer: number) =>
  Boolean(spec.calm) && layer < spec.sizes.length - 2 && (spec.sizes[layer + 1] ?? 0) > 1;

/** One example forwards; `keep` (when given) says per layer and cell whether it is on. */
function forwardInto(
  spec: DenseSpec,
  params: ArrayLike<number>,
  input: ArrayLike<number>,
  offset: number,
  pass: Pass,
  keep?: (layer: number, cell: number) => number,
): Float64Array {
  const { sizes } = spec;
  let at = 0;
  for (let layer = 0; layer < sizes.length - 1; layer += 1) {
    const fanIn = sizes[layer] ?? 0;
    const size = sizes[layer + 1] ?? 0;
    const previous = layer === 0 ? null : (pass.outs[layer - 1] as Float64Array);
    const totals = pass.totals[layer] as Float64Array;
    const calmed = pass.calmed[layer] as Float64Array;
    const outs = pass.outs[layer] as Float64Array;
    for (let cell = 0; cell < size; cell += 1) {
      let sum = 0;
      for (let from = 0; from < fanIn; from += 1)
        sum +=
          (params[at + from] ?? 0) *
          (previous ? (previous[from] ?? 0) : (input[offset + from] ?? 0));
      at += fanIn;
      totals[cell] = sum + (params[at] ?? 0);
      at += 1;
    }
    calmed.set(totals);
    if (calmsLayer(spec, layer)) calm(calmed, size);
    const bend = BEND[bendOf(spec, layer)];
    for (let cell = 0; cell < size; cell += 1) {
      const factor = keep ? keep(layer, cell) : 1;
      outs[cell] = factor === 0 ? 0 : bend(calmed[cell] ?? 0) * factor;
    }
  }
  return pass.outs[sizes.length - 2] as Float64Array;
}

/** The mistake for one example's raw outputs. */
function mistake(spec: DenseSpec, outputs: Float64Array, targets: ArrayLike<number>, row: number) {
  const width = outputs.length;
  if (spec.loss === "logistic") {
    const z = outputs[0] ?? 0;
    const y = targets[row] ?? 0;
    return Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z)));
  }
  let total = 0;
  for (let out = 0; out < width; out += 1)
    total += ((outputs[out] ?? 0) - (targets[row * width + out] ?? 0)) ** 2;
  return total / width;
}

/** The network's raw outputs for many rows (nobody switched off). */
export function predict(
  spec: DenseSpec,
  params: ArrayLike<number>,
  inputs: ArrayLike<number>,
): Float64Array {
  const width = spec.sizes[0] ?? 1;
  const outputs = spec.sizes.at(-1) ?? 1;
  const rows = Math.floor(inputs.length / width);
  const pass = makePass(spec.sizes);
  const answers = new Float64Array(rows * outputs);
  for (let row = 0; row < rows; row += 1) {
    const out = forwardInto(spec, params, inputs, row * width, pass);
    for (let index = 0; index < outputs; index += 1)
      answers[row * outputs + index] = out[index] ?? 0;
  }
  return answers;
}

/** A raw output as a chance of "yes" (for logistic networks). */
export const chance = (score: number) => 1 / (1 + Math.exp(-score));

/**
 * What every hidden cell says for each row, one array per hidden layer, cell by cell:
 * cell `c` of a layer is `layer.subarray(c * rows, (c + 1) * rows)`.
 */
export function hiddenOutputs(
  spec: DenseSpec,
  params: ArrayLike<number>,
  inputs: ArrayLike<number>,
): Float64Array[] {
  const width = spec.sizes[0] ?? 1;
  const rows = Math.floor(inputs.length / width);
  const hidden = spec.sizes.slice(1, -1);
  const result = hidden.map((size) => new Float64Array(size * rows));
  const pass = makePass(spec.sizes);
  for (let row = 0; row < rows; row += 1) {
    forwardInto(spec, params, inputs, row * width, pass);
    hidden.forEach((size, layer) => {
      const outs = pass.outs[layer] as Float64Array;
      const target = result[layer] as Float64Array;
      for (let cell = 0; cell < size; cell += 1) target[cell * rows + row] = outs[cell] ?? 0;
    });
  }
  return result;
}

/** Mean mistake over a whole set, nobody switched off. */
export function meanLoss(spec: DenseSpec, params: ArrayLike<number>, data: DenseData): number {
  const width = spec.sizes[0] ?? 1;
  const rows = Math.floor(data.inputs.length / width);
  if (rows === 0) return 0;
  const pass = makePass(spec.sizes);
  let total = 0;
  for (let row = 0; row < rows; row += 1)
    total += mistake(
      spec,
      forwardInto(spec, params, data.inputs, row * width, pass),
      data.targets,
      row,
    );
  return total / rows;
}

/**
 * The slope of the mean mistake over `rows` for every parameter, added into `grads`, plus the
 * mean blame size each weight layer's cells received (added into `blame`).
 */
function accumulate(
  spec: DenseSpec,
  params: ArrayLike<number>,
  data: DenseData,
  rows: readonly number[],
  grads: Float64Array,
  blame: Float64Array,
  pass: Pass,
  deltas: Float64Array[],
  random: Random | null,
) {
  const { sizes } = spec;
  const width = sizes[0] ?? 1;
  const layers = sizes.length - 1;
  const outputs = sizes.at(-1) ?? 1;
  const dropout = random ? Math.min(0.95, Math.max(0, spec.dropout ?? 0)) : 0;
  const masks = sizes.slice(1).map((size) => new Float64Array(size).fill(1));
  // Where each layer's weights start in the parameters.
  const starts: number[] = [];
  let at = 0;
  for (let layer = 0; layer < layers; layer += 1) {
    starts.push(at);
    at += (sizes[layer + 1] ?? 0) * ((sizes[layer] ?? 0) + 1);
  }
  const share = 1 / rows.length;
  for (const row of rows) {
    if (dropout > 0 && random)
      for (let layer = 0; layer < layers - 1; layer += 1) {
        const mask = masks[layer] as Float64Array;
        for (let cell = 0; cell < mask.length; cell += 1)
          mask[cell] = random.next() < dropout ? 0 : 1 / (1 - dropout);
      }
    const out = forwardInto(
      spec,
      params,
      data.inputs,
      row * width,
      pass,
      dropout > 0
        ? (layer, cell) => (layer < layers - 1 ? (masks[layer]?.[cell] ?? 1) : 1)
        : undefined,
    );
    // Blame on the raw outputs.
    const last = deltas[layers - 1] as Float64Array;
    for (let index = 0; index < outputs; index += 1) {
      const z = out[index] ?? 0;
      last[index] =
        spec.loss === "logistic"
          ? chance(z) - (data.targets[row] ?? 0)
          : (2 * (z - (data.targets[row * outputs + index] ?? 0))) / outputs;
    }
    for (let layer = layers - 1; layer >= 0; layer -= 1) {
      const fanIn = sizes[layer] ?? 0;
      const size = sizes[layer + 1] ?? 0;
      const delta = deltas[layer] as Float64Array;
      // Through the bend (and any switch-off and calming) to the layer's raw totals.
      if (layer < layers - 1) {
        const bend = bendOf(spec, layer);
        const calmed = pass.calmed[layer] as Float64Array;
        const outs = pass.outs[layer] as Float64Array;
        const mask = masks[layer] as Float64Array;
        for (let cell = 0; cell < size; cell += 1) {
          const factor = dropout > 0 ? (mask[cell] ?? 1) : 1;
          const bent = factor === 0 ? 0 : (outs[cell] ?? 0) / factor;
          delta[cell] = (delta[cell] ?? 0) * factor * SLOPE[bend](calmed[cell] ?? 0, bent);
        }
        if (calmsLayer(spec, layer)) {
          // Back through re-centring and re-scaling: (d − mean d − ĥ·mean(d·ĥ)) / spread.
          const totals = pass.totals[layer] as Float64Array;
          let mean = 0;
          for (let cell = 0; cell < size; cell += 1) mean += totals[cell] ?? 0;
          mean /= size;
          let variance = 0;
          for (let cell = 0; cell < size; cell += 1) variance += ((totals[cell] ?? 0) - mean) ** 2;
          const spread = Math.sqrt(variance / size + CALM_EPSILON);
          let meanDelta = 0;
          let meanCross = 0;
          for (let cell = 0; cell < size; cell += 1) {
            meanDelta += delta[cell] ?? 0;
            meanCross += (delta[cell] ?? 0) * (calmed[cell] ?? 0);
          }
          meanDelta /= size;
          meanCross /= size;
          for (let cell = 0; cell < size; cell += 1)
            delta[cell] =
              ((delta[cell] ?? 0) - meanDelta - (calmed[cell] ?? 0) * meanCross) / spread;
        }
      }
      let size2 = 0;
      for (let cell = 0; cell < size; cell += 1) size2 += Math.abs(delta[cell] ?? 0);
      blame[layer] = (blame[layer] ?? 0) + (share * size2) / (size || 1);
      const previous = layer === 0 ? null : (pass.outs[layer - 1] as Float64Array);
      const below = layer === 0 ? null : (deltas[layer - 1] as Float64Array);
      if (below) below.fill(0);
      let index = starts[layer] ?? 0;
      for (let cell = 0; cell < size; cell += 1) {
        const d = (delta[cell] ?? 0) * share;
        for (let from = 0; from < fanIn; from += 1) {
          const input = previous ? (previous[from] ?? 0) : (data.inputs[row * width + from] ?? 0);
          grads[index + from] = (grads[index + from] ?? 0) + d * input;
          if (below)
            below[from] = (below[from] ?? 0) + (delta[cell] ?? 0) * (params[index + from] ?? 0);
        }
        index += fanIn;
        grads[index] = (grads[index] ?? 0) + d;
        index += 1;
      }
    }
  }
}

/** The slope of the mean mistake over the whole set (nobody switched off), for tests and tools. */
export function gradient(
  spec: DenseSpec,
  params: ArrayLike<number>,
  data: DenseData,
): Float64Array {
  const width = spec.sizes[0] ?? 1;
  const rows = Array.from({ length: Math.floor(data.inputs.length / width) }, (_, row) => row);
  const grads = new Float64Array(params.length);
  const blame = new Float64Array(spec.sizes.length - 1);
  accumulate(
    spec,
    params,
    data,
    rows,
    grads,
    blame,
    makePass(spec.sizes),
    spec.sizes.slice(1).map((size) => new Float64Array(size)),
    null,
  );
  return grads;
}

export type DenseTrainer = {
  readonly params: Float64Array;
  /** Runs one round (every example once, in batches) and reports the state before it. */
  round(): RoundReport;
  /** Rounds done so far. */
  readonly rounds: number;
};

/** A trainer that changes `params` in place, round by round; the same inputs give the same run. */
export function createTrainer(
  spec: DenseSpec,
  params: Float64Array,
  data: DenseData,
  practice: DensePractice,
): DenseTrainer {
  const width = spec.sizes[0] ?? 1;
  const rowCount = Math.floor(data.inputs.length / width);
  const random = createRandom(practice.seed);
  const pass = makePass(spec.sizes);
  const deltas = spec.sizes.slice(1).map((size) => new Float64Array(size));
  const grads = new Float64Array(params.length);
  const velocity = new Float64Array(params.length);
  const second = new Float64Array(params.length);
  const order = Array.from({ length: rowCount }, (_, row) => row);
  const batch = Math.max(1, Math.min(rowCount, Math.round(practice.batchSize ?? rowCount)));
  let steps = 0;
  let rounds = 0;
  const rateAt = (round: number) =>
    typeof practice.learningRate === "number"
      ? practice.learningRate
      : practice.learningRate(round);

  const step = (rate: number) => {
    steps += 1;
    const momentum = practice.momentum ?? 0.9;
    for (let index = 0; index < params.length; index += 1) {
      const grad = grads[index] ?? 0;
      if (practice.optimiser === "sgd") params[index] = (params[index] ?? 0) - rate * grad;
      else if (practice.optimiser === "momentum") {
        const v = momentum * (velocity[index] ?? 0) + grad;
        velocity[index] = v;
        params[index] = (params[index] ?? 0) - rate * v;
      } else {
        const m = ADAM.beta1 * (velocity[index] ?? 0) + (1 - ADAM.beta1) * grad;
        const s = ADAM.beta2 * (second[index] ?? 0) + (1 - ADAM.beta2) * grad * grad;
        velocity[index] = m;
        second[index] = s;
        const mHat = m / (1 - ADAM.beta1 ** steps);
        const sHat = s / (1 - ADAM.beta2 ** steps);
        params[index] = (params[index] ?? 0) - (rate * mHat) / (Math.sqrt(sHat) + ADAM.epsilon);
      }
    }
  };

  return {
    params,
    get rounds() {
      return rounds;
    },
    round() {
      const loss = meanLoss(spec, params, data);
      const blame = new Float64Array(spec.sizes.length - 1);
      if (rowCount === 0) return { loss, blame: Array.from(blame) };
      // A fresh order each round (Fisher–Yates), unless the whole set is one batch.
      if (batch < rowCount)
        for (let index = rowCount - 1; index > 0; index -= 1) {
          const swap = random.int(index + 1);
          [order[index], order[swap]] = [order[swap] as number, order[index] as number];
        }
      const batches = Math.ceil(rowCount / batch);
      const rate = rateAt(rounds);
      for (let start = 0; start < rowCount; start += batch) {
        grads.fill(0);
        accumulate(
          spec,
          params,
          data,
          order.slice(start, start + batch),
          grads,
          blame,
          pass,
          deltas,
          (spec.dropout ?? 0) > 0 ? random : null,
        );
        step(rate);
      }
      rounds += 1;
      return { loss, blame: Array.from(blame, (value) => value / batches) };
    },
  };
}

/** True when every number is finite: a run whose steps blew up is not. */
export const allFinite = (values: ArrayLike<number>) => {
  for (let index = 0; index < values.length; index += 1)
    if (!Number.isFinite(values[index])) return false;
  return true;
};

/**
 * A tiny network for World 6's agents: inputs → one tanh hidden layer → raw outputs (move scores,
 * move leanings or a value). Forward, backward from a gradient on the outputs, and Adam. Plain
 * typed arrays, seeded starts and only +, −, ×, ÷ and √ (with our own `exp` and `tanh` built from
 * them), so a run is bit-identical in Node and every browser: a link replays the same agent.
 *
 * Parameter order: hidden weights (row per hidden cell, `inputs` long), hidden biases, output
 * weights (row per output, `hidden` long), output biases.
 */
import { multiplied } from "../multiplications";
import { createRandom } from "../random";

export type NetShape = { inputs: number; hidden: number; outputs: number };

export type TinyNet = { shape: NetShape; params: Float64Array };

/** What one forward pass leaves behind, for the backward pass. */
export type Pass = { input: ArrayLike<number>; hidden: Float64Array; output: Float64Array };

export const paramCount = ({ inputs, hidden, outputs }: NetShape) =>
  hidden * inputs + hidden + outputs * hidden + outputs;

const LN2 = 0.6931471805599453;
/** 2^k for k in −1074…1023, built by exact doubling and halving. */
const POWERS = new Map<number, number>();
function twoTo(k: number): number {
  const known = POWERS.get(k);
  if (known !== undefined) return known;
  let value = 1;
  for (let at = 0; at < Math.abs(k); at += 1) value = k > 0 ? value * 2 : value / 2;
  POWERS.set(k, value);
  return value;
}

/**
 * e^x from a Taylor series on x − k·ln 2 (|r| ≤ 0.35, 14 terms: within 1e-15 relative), scaled
 * by an exact power of two. Our own, because Math.exp may differ in its last digit between
 * JavaScript engines, and a training run would drift apart from there.
 */
export function exp(x: number): number {
  if (x > 700) return Infinity;
  if (x < -700) return 0;
  const k = Math.round(x / LN2);
  const r = x - k * LN2;
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 14; n += 1) {
    term = (term * r) / n;
    sum += term;
  }
  return sum * twoTo(k);
}

/** tanh from `exp`, so it too is the same everywhere. */
export function tanh(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e = exp(-2 * Math.abs(x));
  const value = (1 - e) / (1 + e);
  return x < 0 ? -value : value;
}

/** A fresh network, every weight drawn evenly within ±1/√(cells feeding it); biases zero. */
export function createNet(shape: NetShape, seed: number): TinyNet {
  const random = createRandom(seed);
  const params = new Float64Array(paramCount(shape));
  const { inputs, hidden, outputs } = shape;
  const firstBound = 1 / Math.sqrt(inputs);
  for (let at = 0; at < hidden * inputs; at += 1)
    params[at] = random.range(-firstBound, firstBound);
  const secondStart = hidden * inputs + hidden;
  const secondBound = 1 / Math.sqrt(hidden);
  for (let at = 0; at < outputs * hidden; at += 1)
    params[secondStart + at] = random.range(-secondBound, secondBound);
  return { shape, params };
}

export const copyNet = (net: TinyNet): TinyNet => ({
  shape: net.shape,
  params: net.params.slice(),
});

/** Runs the network on `input`. */
export function forward(net: TinyNet, input: ArrayLike<number>): Pass {
  const { inputs, hidden: cells, outputs } = net.shape;
  const p = net.params;
  const hidden = new Float64Array(cells);
  const biasStart = cells * inputs;
  // A one-place input (which square the player stands on) costs one multiplication per cell.
  let lit = 0;
  for (let at = 0; at < inputs; at += 1) if ((input[at] ?? 0) !== 0) lit += 1;
  multiplied(lit * cells + outputs * cells);
  for (let cell = 0; cell < cells; cell += 1) {
    let sum = p[biasStart + cell] ?? 0;
    const row = cell * inputs;
    for (let at = 0; at < inputs; at += 1) {
      const value = input[at] ?? 0;
      if (value !== 0) sum += (p[row + at] ?? 0) * value;
    }
    hidden[cell] = tanh(sum);
  }
  const output = new Float64Array(outputs);
  const secondStart = biasStart + cells;
  const outBias = secondStart + outputs * cells;
  for (let out = 0; out < outputs; out += 1) {
    let sum = p[outBias + out] ?? 0;
    const row = secondStart + out * cells;
    for (let cell = 0; cell < cells; cell += 1) sum += (p[row + cell] ?? 0) * (hidden[cell] ?? 0);
    output[out] = sum;
  }
  return { input, hidden, output };
}

/**
 * Adds to `grads` the gradient of whatever loss gave `outputGrad` (its gradient on each output)
 * through `pass`, a forward pass of `net`.
 */
export function backward(
  net: TinyNet,
  pass: Pass,
  outputGrad: ArrayLike<number>,
  grads: Float64Array,
): void {
  const { inputs, hidden: cells, outputs } = net.shape;
  const p = net.params;
  const biasStart = cells * inputs;
  const secondStart = biasStart + cells;
  const outBias = secondStart + outputs * cells;
  const hiddenGrad = new Float64Array(cells);
  for (let out = 0; out < outputs; out += 1) {
    const g = outputGrad[out] ?? 0;
    if (g === 0) continue;
    multiplied(2 * cells);
    grads[outBias + out] = (grads[outBias + out] ?? 0) + g;
    const row = secondStart + out * cells;
    for (let cell = 0; cell < cells; cell += 1) {
      grads[row + cell] = (grads[row + cell] ?? 0) + g * (pass.hidden[cell] ?? 0);
      hiddenGrad[cell] = (hiddenGrad[cell] ?? 0) + g * (p[row + cell] ?? 0);
    }
  }
  let lit = 0;
  for (let at = 0; at < inputs; at += 1) if ((pass.input[at] ?? 0) !== 0) lit += 1;
  for (let cell = 0; cell < cells; cell += 1) {
    const h = pass.hidden[cell] ?? 0;
    const g = (hiddenGrad[cell] ?? 0) * (1 - h * h);
    if (g === 0) continue;
    multiplied(lit);
    grads[biasStart + cell] = (grads[biasStart + cell] ?? 0) + g;
    const row = cell * inputs;
    for (let at = 0; at < inputs; at += 1) {
      const value = pass.input[at] ?? 0;
      if (value !== 0) grads[row + at] = (grads[row + at] ?? 0) + g * value;
    }
  }
}

export type Adam = {
  /** Moves `params` against `grads` (then leaves `grads` alone; the caller clears them). */
  step(params: Float64Array, grads: Float64Array, rate: number): void;
};

/** Adam with the usual settings, its bias correction kept as running products (no Math.pow). */
export function createAdam(size: number, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8): Adam {
  const first = new Float64Array(size);
  const second = new Float64Array(size);
  let fade1 = 1;
  let fade2 = 1;
  return {
    step(params, grads, rate) {
      fade1 *= beta1;
      fade2 *= beta2;
      for (let at = 0; at < size; at += 1) {
        const g = grads[at] ?? 0;
        const m = beta1 * (first[at] ?? 0) + (1 - beta1) * g;
        const v = beta2 * (second[at] ?? 0) + (1 - beta2) * g * g;
        first[at] = m;
        second[at] = v;
        params[at] =
          (params[at] ?? 0) - (rate * (m / (1 - fade1))) / (Math.sqrt(v / (1 - fade2)) + epsilon);
      }
    },
  };
}

/** Chances from raw leanings (softmax), with our own `exp`. */
export function softmax(scores: ArrayLike<number>): Float64Array {
  let most = -Infinity;
  for (let at = 0; at < scores.length; at += 1) most = Math.max(most, scores[at] ?? 0);
  const chances = new Float64Array(scores.length);
  let total = 0;
  for (let at = 0; at < scores.length; at += 1) {
    const value = exp((scores[at] ?? 0) - most);
    chances[at] = value;
    total += value;
  }
  for (let at = 0; at < scores.length; at += 1) chances[at] = (chances[at] ?? 0) / total;
  return chances;
}

/** The index of the biggest value (the first, on a tie). */
export function argmax(values: ArrayLike<number>): number {
  let best = 0;
  for (let at = 1; at < values.length; at += 1)
    if ((values[at] ?? 0) > (values[best] ?? 0)) best = at;
  return best;
}

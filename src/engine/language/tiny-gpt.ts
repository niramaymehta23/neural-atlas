/**
 * A tiny GPT as plain typed-array maths: word (or letter) codes plus place codes, then blocks of
 * "look around" (causal multi-head attention) and "think" (a two-layer network with GELU), each
 * added onto a running stream (the shortcut), with layer normalisation before each part; a last
 * normalisation and a layer that scores every possible next piece. Pre-LN GPT-2 style.
 *
 * It runs the weights trained offline by scripts/train-writers.py (PyTorch, same layout) and trains
 * in the browser for baby GPT: `trainStep` is a full backward pass and an Adam step. Pure and
 * deterministic: the same weights, batch and settings give the same numbers every time.
 */
import { multiplied } from "../multiplications";
import { createRandom } from "../random";

export type GptShape = {
  /** How many different pieces it knows. */
  vocab: number;
  /** How many pieces it reads at once. */
  context: number;
  /** Numbers per piece in the stream. */
  width: number;
  heads: number;
  layers: number;
};

type Numbers = Float32Array | Float64Array;

/** Where each named tensor sits in the flat parameter array. Weights are rows of inputs. */
export function layout(shape: GptShape) {
  const { vocab, context, width: w, layers } = shape;
  const entries: [string, number][] = [
    ["tokens", vocab * w],
    ["places", context * w],
  ];
  for (let l = 0; l < layers; l += 1) {
    entries.push(
      [`${l}.ln1.gain`, w],
      [`${l}.ln1.bias`, w],
      [`${l}.qkv.weight`, w * 3 * w],
      [`${l}.qkv.bias`, 3 * w],
      [`${l}.proj.weight`, w * w],
      [`${l}.proj.bias`, w],
      [`${l}.ln2.gain`, w],
      [`${l}.ln2.bias`, w],
      [`${l}.fc.weight`, w * 4 * w],
      [`${l}.fc.bias`, 4 * w],
      [`${l}.out.weight`, 4 * w * w],
      [`${l}.out.bias`, w],
    );
  }
  entries.push(["lnf.gain", w], ["lnf.bias", w], ["head.weight", w * vocab], ["head.bias", vocab]);
  const offsets = new Map<string, number>();
  let total = 0;
  for (const [name, size] of entries) {
    offsets.set(name, total);
    total += size;
  }
  return { offsets, total, entries };
}

export type Gpt = {
  shape: GptShape;
  params: Numbers;
  at: (name: string) => number;
};

export function createGpt(shape: GptShape, params: Numbers): Gpt {
  if (shape.width % shape.heads !== 0) throw new Error("The width must split evenly into heads.");
  const { offsets, total } = layout(shape);
  if (params.length !== total) throw new Error(`Expected ${total} numbers, got ${params.length}.`);
  return {
    shape,
    params,
    at: (name) => {
      const offset = offsets.get(name);
      if (offset === undefined) throw new Error(`No tensor called ${name}.`);
      return offset;
    },
  };
}

/** Fresh weights: small random weights, zero biases, normalisation gains of one. */
export function freshGpt(shape: GptShape, seed: number, kind: "32" | "64" = "32"): Gpt {
  const { entries, total } = layout(shape);
  const params = kind === "64" ? new Float64Array(total) : new Float32Array(total);
  const random = createRandom(seed);
  let offset = 0;
  for (const [name, size] of entries) {
    const gain = name.endsWith("gain");
    const bias = name.endsWith("bias");
    // Layers that add onto the stream start smaller, as in GPT-2.
    const spread =
      name.endsWith("proj.weight") || name.endsWith("out.weight")
        ? 0.02 / Math.sqrt(2 * shape.layers)
        : 0.02;
    for (let i = 0; i < size; i += 1) {
      params[offset + i] = gain ? 1 : bias ? 0 : random.normal() * spread;
    }
    offset += size;
  }
  return createGpt(shape, params);
}

const GELU_C = Math.sqrt(2 / Math.PI);
const EPSILON = 1e-5;

/** y[n×out] = x[n×in] · W[in×out] + b, with W and b read from `p` at the given offsets. */
function linear(
  x: Numbers,
  n: number,
  inputs: number,
  outputs: number,
  p: Numbers,
  wAt: number,
  bAt: number,
  y: Numbers,
) {
  for (let r = 0; r < n; r += 1) {
    const yRow = r * outputs;
    for (let o = 0; o < outputs; o += 1) y[yRow + o] = p[bAt + o] ?? 0;
    for (let i = 0; i < inputs; i += 1) {
      const xi = x[r * inputs + i] ?? 0;
      if (xi === 0) continue;
      multiplied(outputs);
      const wRow = wAt + i * outputs;
      for (let o = 0; o < outputs; o += 1)
        y[yRow + o] = (y[yRow + o] ?? 0) + xi * (p[wRow + o] ?? 0);
    }
  }
}

/** Gradients of `linear`: adds into dW and db at the offsets, writes dx (if given). */
function linearBack(
  x: Numbers,
  dy: Numbers,
  n: number,
  inputs: number,
  outputs: number,
  p: Numbers,
  g: Numbers,
  wAt: number,
  bAt: number,
  dx: Numbers | null,
) {
  for (let r = 0; r < n; r += 1) {
    const dyRow = r * outputs;
    for (let o = 0; o < outputs; o += 1) g[bAt + o] = (g[bAt + o] ?? 0) + (dy[dyRow + o] ?? 0);
    for (let i = 0; i < inputs; i += 1) {
      const xi = x[r * inputs + i] ?? 0;
      const wRow = wAt + i * outputs;
      let sum = 0;
      multiplied(2 * outputs);
      for (let o = 0; o < outputs; o += 1) {
        const d = dy[dyRow + o] ?? 0;
        g[wRow + o] = (g[wRow + o] ?? 0) + xi * d;
        sum += d * (p[wRow + o] ?? 0);
      }
      if (dx) dx[r * inputs + i] = sum;
    }
  }
}

/** Layer normalisation of each row; keeps the normalised rows and the inverse spreads. */
function norm(
  x: Numbers,
  n: number,
  w: number,
  p: Numbers,
  gainAt: number,
  biasAt: number,
  hat: Numbers,
  inverse: Numbers,
  y: Numbers,
) {
  for (let r = 0; r < n; r += 1) {
    let mean = 0;
    for (let i = 0; i < w; i += 1) mean += x[r * w + i] ?? 0;
    mean /= w;
    let spread = 0;
    for (let i = 0; i < w; i += 1) spread += ((x[r * w + i] ?? 0) - mean) ** 2;
    const inv = 1 / Math.sqrt(spread / w + EPSILON);
    inverse[r] = inv;
    for (let i = 0; i < w; i += 1) {
      const h = ((x[r * w + i] ?? 0) - mean) * inv;
      hat[r * w + i] = h;
      y[r * w + i] = h * (p[gainAt + i] ?? 0) + (p[biasAt + i] ?? 0);
    }
  }
}

function normBack(
  dy: Numbers,
  n: number,
  w: number,
  p: Numbers,
  g: Numbers,
  gainAt: number,
  biasAt: number,
  hat: Numbers,
  inverse: Numbers,
  dx: Numbers,
) {
  for (let r = 0; r < n; r += 1) {
    let meanD = 0;
    let meanDH = 0;
    for (let i = 0; i < w; i += 1) {
      const d = dy[r * w + i] ?? 0;
      const h = hat[r * w + i] ?? 0;
      g[gainAt + i] = (g[gainAt + i] ?? 0) + d * h;
      g[biasAt + i] = (g[biasAt + i] ?? 0) + d;
      const dh = d * (p[gainAt + i] ?? 0);
      meanD += dh;
      meanDH += dh * h;
    }
    meanD /= w;
    meanDH /= w;
    const inv = inverse[r] ?? 0;
    for (let i = 0; i < w; i += 1) {
      const dh = (dy[r * w + i] ?? 0) * (p[gainAt + i] ?? 0);
      dx[r * w + i] = inv * (dh - meanD - (hat[r * w + i] ?? 0) * meanDH);
    }
  }
}

/** Everything one block keeps from the forward pass for the backward one. */
type BlockCache = {
  input: Numbers;
  hat1: Numbers;
  inv1: Numbers;
  normed1: Numbers;
  qkv: Numbers;
  /** Attention shares per head, row by row (n × n each). */
  shares: Numbers;
  mixed: Numbers;
  middle: Numbers;
  hat2: Numbers;
  inv2: Numbers;
  normed2: Numbers;
  wide: Numbers;
  bent: Numbers;
};

type Pass = {
  n: number;
  ids: number[];
  blocks: BlockCache[];
  last: Numbers;
  hatF: Numbers;
  invF: Numbers;
  normedF: Numbers;
  logits: Numbers;
};

function make(kind: Numbers, size: number): Numbers {
  return kind instanceof Float64Array ? new Float64Array(size) : new Float32Array(size);
}

/** The forward pass over `ids` (at most `context` of them), keeping what backward needs. */
function run(model: Gpt, ids: readonly number[], keep: boolean): Pass {
  const { shape, params: p, at } = model;
  const { width: w, heads, vocab } = shape;
  const n = ids.length;
  if (n === 0 || n > shape.context) throw new Error(`Read 1 to ${shape.context} pieces, not ${n}.`);
  const size = w / heads;
  const scale = 1 / Math.sqrt(size);
  let x = make(p, n * w);
  const tokens = at("tokens");
  const places = at("places");
  ids.forEach((id, r) => {
    if (!(id >= 0 && id < vocab)) throw new Error(`Unknown piece ${id}.`);
    for (let i = 0; i < w; i += 1)
      x[r * w + i] = (p[tokens + id * w + i] ?? 0) + (p[places + r * w + i] ?? 0);
  });
  const blocks: BlockCache[] = [];
  for (let l = 0; l < shape.layers; l += 1) {
    const hat1 = make(p, n * w);
    const inv1 = make(p, n);
    const normed1 = make(p, n * w);
    norm(x, n, w, p, at(`${l}.ln1.gain`), at(`${l}.ln1.bias`), hat1, inv1, normed1);
    const qkv = make(p, n * 3 * w);
    linear(normed1, n, w, 3 * w, p, at(`${l}.qkv.weight`), at(`${l}.qkv.bias`), qkv);
    const shares = make(p, heads * n * n);
    const mixed = make(p, n * w);
    for (let h = 0; h < heads; h += 1) {
      for (let i = 0; i < n; i += 1) {
        let top = -Infinity;
        const row = h * n * n + i * n;
        // Comparing with every piece so far, then mixing what they say.
        multiplied(2 * size * (i + 1));
        for (let j = 0; j <= i; j += 1) {
          let s = 0;
          for (let d = 0; d < size; d += 1) {
            s += (qkv[i * 3 * w + h * size + d] ?? 0) * (qkv[j * 3 * w + w + h * size + d] ?? 0);
          }
          s *= scale;
          shares[row + j] = s;
          if (s > top) top = s;
        }
        let total = 0;
        for (let j = 0; j <= i; j += 1) {
          const e = Math.exp((shares[row + j] ?? 0) - top);
          shares[row + j] = e;
          total += e;
        }
        for (let j = 0; j <= i; j += 1) shares[row + j] = (shares[row + j] ?? 0) / total;
        for (let d = 0; d < size; d += 1) {
          let sum = 0;
          for (let j = 0; j <= i; j += 1)
            sum += (shares[row + j] ?? 0) * (qkv[j * 3 * w + 2 * w + h * size + d] ?? 0);
          mixed[i * w + h * size + d] = sum;
        }
      }
    }
    const looked = make(p, n * w);
    linear(mixed, n, w, w, p, at(`${l}.proj.weight`), at(`${l}.proj.bias`), looked);
    const middle = make(p, n * w);
    for (let i = 0; i < n * w; i += 1) middle[i] = (x[i] ?? 0) + (looked[i] ?? 0);
    const hat2 = make(p, n * w);
    const inv2 = make(p, n);
    const normed2 = make(p, n * w);
    norm(middle, n, w, p, at(`${l}.ln2.gain`), at(`${l}.ln2.bias`), hat2, inv2, normed2);
    const wide = make(p, n * 4 * w);
    linear(normed2, n, w, 4 * w, p, at(`${l}.fc.weight`), at(`${l}.fc.bias`), wide);
    const bent = make(p, n * 4 * w);
    for (let i = 0; i < n * 4 * w; i += 1) {
      const v = wide[i] ?? 0;
      bent[i] = 0.5 * v * (1 + Math.tanh(GELU_C * (v + 0.044715 * v * v * v)));
    }
    const thought = make(p, n * w);
    linear(bent, n, 4 * w, w, p, at(`${l}.out.weight`), at(`${l}.out.bias`), thought);
    const next = make(p, n * w);
    for (let i = 0; i < n * w; i += 1) next[i] = (middle[i] ?? 0) + (thought[i] ?? 0);
    if (keep)
      blocks.push({
        input: x,
        hat1,
        inv1,
        normed1,
        qkv,
        shares,
        mixed,
        middle,
        hat2,
        inv2,
        normed2,
        wide,
        bent,
      });
    x = next;
  }
  const hatF = make(p, n * w);
  const invF = make(p, n);
  const normedF = make(p, n * w);
  norm(x, n, w, p, at("lnf.gain"), at("lnf.bias"), hatF, invF, normedF);
  const logits = make(p, n * vocab);
  linear(normedF, n, w, vocab, p, at("head.weight"), at("head.bias"), logits);
  return { n, ids: [...ids], blocks, last: x, hatF, invF, normedF, logits };
}

/** Scores for the piece after each of `ids` (n × vocab). */
export function scoresOf(model: Gpt, ids: readonly number[]): Numbers {
  return run(model, ids, false).logits;
}

/** Scores for the piece after the last of `ids` (only the last `context` are read). */
export function nextScores(model: Gpt, ids: readonly number[]): Float64Array {
  const read = ids.slice(-model.shape.context);
  const { logits, n } = run(model, read, false);
  const { vocab } = model.shape;
  return Float64Array.from(logits.subarray((n - 1) * vocab, n * vocab));
}

/**
 * Reads pieces one at a time and gives the scores for the piece after each, keeping every block's
 * keys and values so a new piece costs one position rather than a pass over everything read so
 * far. Each step does the same sums, in the same order and the same number type, as `run`, so the
 * scores equal `nextScores` exactly. It reads at most `context` pieces.
 */
export function createReader(model: Gpt) {
  const { shape, params: p, at } = model;
  const { width: w, heads, vocab, context } = shape;
  const size = w / heads;
  const scale = 1 / Math.sqrt(size);
  const tokens = at("tokens");
  const places = at("places");
  const keys = Array.from({ length: shape.layers }, () => make(p, context * w));
  const values = Array.from({ length: shape.layers }, () => make(p, context * w));
  let count = 0;

  return {
    /** How many pieces it has read. */
    count: () => count,
    /** Reads `id` and returns the scores for the piece after it. */
    read(id: number): Float64Array {
      const r = count;
      if (r >= context) throw new Error(`Read 1 to ${context} pieces, not ${r + 1}.`);
      if (!(id >= 0 && id < vocab)) throw new Error(`Unknown piece ${id}.`);
      let x = make(p, w);
      for (let i = 0; i < w; i += 1)
        x[i] = (p[tokens + id * w + i] ?? 0) + (p[places + r * w + i] ?? 0);
      for (let l = 0; l < shape.layers; l += 1) {
        const ownKeys = keys[l] ?? make(p, 0);
        const ownValues = values[l] ?? make(p, 0);
        const normed1 = make(p, w);
        norm(x, 1, w, p, at(`${l}.ln1.gain`), at(`${l}.ln1.bias`), make(p, w), make(p, 1), normed1);
        const qkv = make(p, 3 * w);
        linear(normed1, 1, w, 3 * w, p, at(`${l}.qkv.weight`), at(`${l}.qkv.bias`), qkv);
        for (let i = 0; i < w; i += 1) {
          ownKeys[r * w + i] = qkv[w + i] ?? 0;
          ownValues[r * w + i] = qkv[2 * w + i] ?? 0;
        }
        const shares = make(p, r + 1);
        const mixed = make(p, w);
        for (let h = 0; h < heads; h += 1) {
          let top = -Infinity;
          multiplied(2 * size * (r + 1));
          for (let j = 0; j <= r; j += 1) {
            let s = 0;
            for (let d = 0; d < size; d += 1)
              s += (qkv[h * size + d] ?? 0) * (ownKeys[j * w + h * size + d] ?? 0);
            s *= scale;
            shares[j] = s;
            if (s > top) top = s;
          }
          let total = 0;
          for (let j = 0; j <= r; j += 1) {
            const e = Math.exp((shares[j] ?? 0) - top);
            shares[j] = e;
            total += e;
          }
          for (let j = 0; j <= r; j += 1) shares[j] = (shares[j] ?? 0) / total;
          for (let d = 0; d < size; d += 1) {
            let sum = 0;
            for (let j = 0; j <= r; j += 1)
              sum += (shares[j] ?? 0) * (ownValues[j * w + h * size + d] ?? 0);
            mixed[h * size + d] = sum;
          }
        }
        const looked = make(p, w);
        linear(mixed, 1, w, w, p, at(`${l}.proj.weight`), at(`${l}.proj.bias`), looked);
        const middle = make(p, w);
        for (let i = 0; i < w; i += 1) middle[i] = (x[i] ?? 0) + (looked[i] ?? 0);
        const normed2 = make(p, w);
        norm(
          middle,
          1,
          w,
          p,
          at(`${l}.ln2.gain`),
          at(`${l}.ln2.bias`),
          make(p, w),
          make(p, 1),
          normed2,
        );
        const wide = make(p, 4 * w);
        linear(normed2, 1, w, 4 * w, p, at(`${l}.fc.weight`), at(`${l}.fc.bias`), wide);
        const bent = make(p, 4 * w);
        for (let i = 0; i < 4 * w; i += 1) {
          const v = wide[i] ?? 0;
          bent[i] = 0.5 * v * (1 + Math.tanh(GELU_C * (v + 0.044715 * v * v * v)));
        }
        const thought = make(p, w);
        linear(bent, 1, 4 * w, w, p, at(`${l}.out.weight`), at(`${l}.out.bias`), thought);
        const next = make(p, w);
        for (let i = 0; i < w; i += 1) next[i] = (middle[i] ?? 0) + (thought[i] ?? 0);
        x = next;
      }
      const normedF = make(p, w);
      norm(x, 1, w, p, at("lnf.gain"), at("lnf.bias"), make(p, w), make(p, 1), normedF);
      const logits = make(p, vocab);
      linear(normedF, 1, w, vocab, p, at("head.weight"), at("head.bias"), logits);
      count += 1;
      return Float64Array.from(logits);
    },
  };
}

/** Mean surprise (cross-entropy, in nats) of each next piece in `ids`; at least two pieces. */
export function surpriseOf(model: Gpt, ids: readonly number[]): number {
  const { logits, n } = run(model, ids, false);
  return crossEntropy(logits, ids, n, model.shape.vocab, null);
}

/** Mean cross-entropy of predicting ids[r + 1] at r; writes d(loss)/d(logits) when `grad` is given. */
function crossEntropy(
  logits: Numbers,
  ids: readonly number[],
  n: number,
  vocab: number,
  grad: Numbers | null,
) {
  let loss = 0;
  const count = n - 1;
  for (let r = 0; r < count; r += 1) {
    let top = -Infinity;
    for (let v = 0; v < vocab; v += 1) top = Math.max(top, logits[r * vocab + v] ?? 0);
    let total = 0;
    for (let v = 0; v < vocab; v += 1) total += Math.exp((logits[r * vocab + v] ?? 0) - top);
    const target = ids[r + 1] ?? 0;
    loss += Math.log(total) + top - (logits[r * vocab + target] ?? 0);
    if (grad) {
      for (let v = 0; v < vocab; v += 1) {
        const share = Math.exp((logits[r * vocab + v] ?? 0) - top) / total;
        grad[r * vocab + v] = (share - (v === target ? 1 : 0)) / count;
      }
    }
  }
  return count > 0 ? loss / count : 0;
}

/**
 * Adds the gradient of the mean next-piece surprise over `sequence` (each piece predicts the next)
 * into `grads`, scaled by `weight`; returns the surprise.
 */
export function accumulate(
  model: Gpt,
  sequence: readonly number[],
  grads: Numbers,
  weight = 1,
): number {
  const { shape, params: p, at } = model;
  const { width: w, heads, vocab } = shape;
  const pass = run(model, sequence, true);
  const { n } = pass;
  const dLogits = make(p, n * vocab);
  const loss = crossEntropy(pass.logits, sequence, n, vocab, dLogits);
  if (weight !== 1)
    for (let i = 0; i < dLogits.length; i += 1) dLogits[i] = (dLogits[i] ?? 0) * weight;
  const dNormed = make(p, n * w);
  linearBack(
    pass.normedF,
    dLogits,
    n,
    w,
    vocab,
    p,
    grads,
    at("head.weight"),
    at("head.bias"),
    dNormed,
  );
  let dx = make(p, n * w);
  normBack(dNormed, n, w, p, grads, at("lnf.gain"), at("lnf.bias"), pass.hatF, pass.invF, dx);
  const size = w / heads;
  const scale = 1 / Math.sqrt(size);
  for (let l = shape.layers - 1; l >= 0; l -= 1) {
    const c = pass.blocks[l];
    if (!c) throw new Error("Missing block cache.");
    // Thinking part: x = middle + out(gelu(fc(ln2(middle)))).
    const dBent = make(p, n * 4 * w);
    linearBack(
      c.bent,
      dx,
      n,
      4 * w,
      w,
      p,
      grads,
      at(`${l}.out.weight`),
      at(`${l}.out.bias`),
      dBent,
    );
    const dWide = make(p, n * 4 * w);
    for (let i = 0; i < n * 4 * w; i += 1) {
      const v = c.wide[i] ?? 0;
      const t = Math.tanh(GELU_C * (v + 0.044715 * v * v * v));
      const slope = 0.5 * (1 + t) + 0.5 * v * (1 - t * t) * GELU_C * (1 + 3 * 0.044715 * v * v);
      dWide[i] = (dBent[i] ?? 0) * slope;
    }
    const dNormed2 = make(p, n * w);
    linearBack(
      c.normed2,
      dWide,
      n,
      w,
      4 * w,
      p,
      grads,
      at(`${l}.fc.weight`),
      at(`${l}.fc.bias`),
      dNormed2,
    );
    const dMiddle = make(p, n * w);
    normBack(
      dNormed2,
      n,
      w,
      p,
      grads,
      at(`${l}.ln2.gain`),
      at(`${l}.ln2.bias`),
      c.hat2,
      c.inv2,
      dMiddle,
    );
    for (let i = 0; i < n * w; i += 1) dMiddle[i] = (dMiddle[i] ?? 0) + (dx[i] ?? 0);
    // Looking part: middle = input + proj(attention(qkv(ln1(input)))).
    const dMixed = make(p, n * w);
    linearBack(
      c.mixed,
      dMiddle,
      n,
      w,
      w,
      p,
      grads,
      at(`${l}.proj.weight`),
      at(`${l}.proj.bias`),
      dMixed,
    );
    const dQkv = make(p, n * 3 * w);
    for (let h = 0; h < heads; h += 1) {
      for (let i = 0; i < n; i += 1) {
        const row = h * n * n + i * n;
        const dShare = make(p, i + 1);
        multiplied(4 * size * (i + 1));
        let weighted = 0;
        for (let j = 0; j <= i; j += 1) {
          let s = 0;
          for (let d = 0; d < size; d += 1) {
            const dy = dMixed[i * w + h * size + d] ?? 0;
            s += dy * (c.qkv[j * 3 * w + 2 * w + h * size + d] ?? 0);
            // d value_j += share_ij · dy_i
            const vAt = j * 3 * w + 2 * w + h * size + d;
            dQkv[vAt] = (dQkv[vAt] ?? 0) + (c.shares[row + j] ?? 0) * dy;
          }
          dShare[j] = s;
          weighted += s * (c.shares[row + j] ?? 0);
        }
        for (let j = 0; j <= i; j += 1) {
          const dScore = (c.shares[row + j] ?? 0) * ((dShare[j] ?? 0) - weighted) * scale;
          if (dScore === 0) continue;
          for (let d = 0; d < size; d += 1) {
            const qAt = i * 3 * w + h * size + d;
            const kAt = j * 3 * w + w + h * size + d;
            dQkv[qAt] = (dQkv[qAt] ?? 0) + dScore * (c.qkv[kAt] ?? 0);
            dQkv[kAt] = (dQkv[kAt] ?? 0) + dScore * (c.qkv[qAt] ?? 0);
          }
        }
      }
    }
    const dNormed1 = make(p, n * w);
    linearBack(
      c.normed1,
      dQkv,
      n,
      w,
      3 * w,
      p,
      grads,
      at(`${l}.qkv.weight`),
      at(`${l}.qkv.bias`),
      dNormed1,
    );
    const dInput = make(p, n * w);
    normBack(
      dNormed1,
      n,
      w,
      p,
      grads,
      at(`${l}.ln1.gain`),
      at(`${l}.ln1.bias`),
      c.hat1,
      c.inv1,
      dInput,
    );
    for (let i = 0; i < n * w; i += 1) dInput[i] = (dInput[i] ?? 0) + (dMiddle[i] ?? 0);
    dx = dInput;
  }
  const tokens = at("tokens");
  const places = at("places");
  pass.ids.forEach((id, r) => {
    for (let i = 0; i < w; i += 1) {
      const d = dx[r * w + i] ?? 0;
      grads[tokens + id * w + i] = (grads[tokens + id * w + i] ?? 0) + d;
      grads[places + r * w + i] = (grads[places + r * w + i] ?? 0) + d;
    }
  });
  return loss;
}

export type Adam = { step: number; first: Numbers; second: Numbers; grads: Numbers };

export function createAdam(model: Gpt): Adam {
  const size = model.params.length;
  return {
    step: 0,
    first: make(model.params, size),
    second: make(model.params, size),
    grads: make(model.params, size),
  };
}

export type StepSettings = { learningRate: number; clip?: number };

/**
 * One practice step on a batch of sequences: the mean surprise's gradient, clipped to `clip`
 * overall length, then Adam (β 0.9, 0.99). Returns the batch's mean surprise before the step.
 */
export function trainStep(
  model: Gpt,
  adam: Adam,
  batch: readonly (readonly number[])[],
  settings: StepSettings,
): number {
  const { grads, first, second } = adam;
  grads.fill(0);
  let loss = 0;
  for (const sequence of batch) loss += accumulate(model, sequence, grads, 1 / batch.length);
  loss /= batch.length;
  let length = 0;
  for (let i = 0; i < grads.length; i += 1) length += (grads[i] ?? 0) ** 2;
  length = Math.sqrt(length);
  const clip = settings.clip ?? 1;
  const shrink = length > clip ? clip / length : 1;
  adam.step += 1;
  const b1 = 0.9;
  const b2 = 0.99;
  const fix1 = 1 - b1 ** adam.step;
  const fix2 = 1 - b2 ** adam.step;
  const p = model.params;
  for (let i = 0; i < p.length; i += 1) {
    const g = (grads[i] ?? 0) * shrink;
    const m = b1 * (first[i] ?? 0) + (1 - b1) * g;
    const v = b2 * (second[i] ?? 0) + (1 - b2) * g * g;
    first[i] = m;
    second[i] = v;
    p[i] = (p[i] ?? 0) - (settings.learningRate * (m / fix1)) / (Math.sqrt(v / fix2) + 1e-8);
  }
  return loss;
}

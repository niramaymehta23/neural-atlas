/**
 * Reading one word at a time: a plain recurrent cell and a gated (LSTM) cell that read a sentence
 * word by word, carry a memory along, and answer at the end. Typed-array maths with backpropagation
 * through time, seeded, so the same settings give the same run every time. Pure: no DOM, no React.
 *
 * The task: a sentence starts with "sunny" or "rainy", goes on with ordinary words, and at the end
 * the cell must say what to take (sunglasses or umbrella). Only the first word tells; every other
 * word is noise to remember past.
 */
import { createRandom } from "../random";

export type Cell = "plain" | "gated";
/** How a gate behaves when the trained cell is used: as it learned, or forced open or shut. */
export type GateMode = "auto" | "open" | "shut";
export type Gates = { keep: GateMode; letIn: GateMode; readOut: GateMode };
export const FREE_GATES: Gates = { keep: "auto", letIn: "auto", readOut: "auto" };

/** The two first words: 0 sunny, 1 rainy. */
export const CUES = 2;
/** Ordinary words that fill the rest of a sentence (their spelling is the lesson's business). */
export const FILLERS = 16;
export const VOCABULARY = CUES + FILLERS;
/** Memory size: how many numbers the cell carries from word to word. */
export const MEMORY = 6;

export type SequenceSpec = { cell: Cell; memory?: number };

/** A sentence as word numbers: the first is a cue (0 or 1), the rest fillers (2…). */
export type Sentence = readonly number[];

const memoryOf = (spec: SequenceSpec) => spec.memory ?? MEMORY;

/** How many numbers a cell has: input and memory weights, nudges, then the answer's weights. */
export function paramCount(spec: SequenceSpec): number {
  const memory = memoryOf(spec);
  const rows = spec.cell === "gated" ? 4 * memory : memory;
  return rows * (VOCABULARY + memory) + rows + memory + 1;
}

/** Seeded starting numbers; the gated cell's "keep" nudges start at 1, so it starts by keeping. */
export function startParams(spec: SequenceSpec, seed: number, spread = 1): Float64Array {
  const random = createRandom(seed);
  const memory = memoryOf(spec);
  const rows = spec.cell === "gated" ? 4 * memory : memory;
  const columns = VOCABULARY + memory;
  const params = new Float64Array(paramCount(spec));
  const scale = spread / Math.sqrt(columns);
  for (let index = 0; index < rows * columns; index += 1) params[index] = random.normal() * scale;
  if (spec.cell === "gated") {
    for (let unit = 0; unit < memory; unit += 1) params[rows * columns + memory + unit] = 1;
  }
  const answer = rows * columns + rows;
  for (let unit = 0; unit < memory; unit += 1) {
    params[answer + unit] = random.normal() / Math.sqrt(memory);
  }
  return params;
}

const chance = (value: number) => 1 / (1 + Math.exp(-value));
const forced = (mode: GateMode, value: number) =>
  mode === "open" ? 1 : mode === "shut" ? 0 : value;

/** What the cell held after each word: its memory (and, for the gated cell, its inner store). */
export type Reading = {
  /** One entry per word: the memory after reading it. */
  memories: Float64Array[];
  /** Gated cell only: the inner store after each word. */
  stores: Float64Array[];
  /** Gated cell only: how open each gate was at each word, averaged over the memory, 0–1. */
  openness: { keep: number; letIn: number; readOut: number }[];
  /** How sure it is that the answer is "umbrella" (rainy), 0–1. */
  rainy: number;
};

/** Reads one sentence. `gates` force the gated cell's gates (training always lets them decide). */
export function read(
  spec: SequenceSpec,
  params: ArrayLike<number>,
  sentence: Sentence,
  gates: Gates = FREE_GATES,
): Reading {
  const memory = memoryOf(spec);
  const columns = VOCABULARY + memory;
  const gated = spec.cell === "gated";
  const rows = gated ? 4 * memory : memory;
  const bias = rows * columns;
  const answer = bias + rows;
  let h = new Float64Array(memory);
  let c = new Float64Array(memory);
  const memories: Float64Array[] = [];
  const stores: Float64Array[] = [];
  const openness: Reading["openness"] = [];
  const z = new Float64Array(rows);
  for (const word of sentence) {
    for (let row = 0; row < rows; row += 1) {
      let sum = (params[bias + row] ?? 0) + (params[row * columns + word] ?? 0);
      for (let unit = 0; unit < memory; unit += 1) {
        sum += (params[row * columns + VOCABULARY + unit] ?? 0) * (h[unit] ?? 0);
      }
      z[row] = sum;
    }
    const nextH = new Float64Array(memory);
    if (gated) {
      const nextC = new Float64Array(memory);
      const open = { keep: 0, letIn: 0, readOut: 0 };
      for (let unit = 0; unit < memory; unit += 1) {
        const letIn = forced(gates.letIn, chance(z[unit] ?? 0));
        const keep = forced(gates.keep, chance(z[memory + unit] ?? 0));
        const readOut = forced(gates.readOut, chance(z[2 * memory + unit] ?? 0));
        const fresh = Math.tanh(z[3 * memory + unit] ?? 0);
        nextC[unit] = keep * (c[unit] ?? 0) + letIn * fresh;
        nextH[unit] = readOut * Math.tanh(nextC[unit] ?? 0);
        open.keep += keep / memory;
        open.letIn += letIn / memory;
        open.readOut += readOut / memory;
      }
      c = nextC;
      stores.push(c);
      openness.push(open);
    } else {
      for (let unit = 0; unit < memory; unit += 1) nextH[unit] = Math.tanh(z[unit] ?? 0);
    }
    h = nextH;
    memories.push(h);
  }
  let score = params[answer + memory] ?? 0;
  for (let unit = 0; unit < memory; unit += 1)
    score += (params[answer + unit] ?? 0) * (h[unit] ?? 0);
  return { memories, stores, openness, rainy: chance(score) };
}

export type Example = { sentence: Sentence; rainy: 0 | 1 };

/**
 * `count` sentences of `length` words in sunny/rainy pairs that share their other words, so only
 * the first word can tell them apart.
 */
export function examples(length: number, count: number, seed: number): Example[] {
  const random = createRandom(seed);
  const pairs: Example[] = [];
  for (let pair = 0; pair < Math.ceil(count / 2); pair += 1) {
    const rest = Array.from({ length: Math.max(0, length - 1) }, () => CUES + random.int(FILLERS));
    pairs.push({ sentence: [0, ...rest], rainy: 0 }, { sentence: [1, ...rest], rainy: 1 });
  }
  return pairs.slice(0, count);
}

/** Mean mistake (cross-entropy) over the examples, and the gradient of every number. */
export function lossAndGradient(
  spec: SequenceSpec,
  params: ArrayLike<number>,
  data: readonly Example[],
): { loss: number; gradient: Float64Array } {
  const memory = memoryOf(spec);
  const columns = VOCABULARY + memory;
  const gated = spec.cell === "gated";
  const rows = gated ? 4 * memory : memory;
  const bias = rows * columns;
  const answer = bias + rows;
  const gradient = new Float64Array(paramCount(spec));
  let loss = 0;
  for (const { sentence, rainy } of data) {
    // Forward, keeping what the backward pass needs.
    const hs: Float64Array[] = [new Float64Array(memory)];
    const cs: Float64Array[] = [new Float64Array(memory)];
    const acts: Float64Array[] = [];
    for (const word of sentence) {
      const h = hs.at(-1) as Float64Array;
      const z = new Float64Array(rows);
      for (let row = 0; row < rows; row += 1) {
        let sum = (params[bias + row] ?? 0) + (params[row * columns + word] ?? 0);
        for (let unit = 0; unit < memory; unit += 1) {
          sum += (params[row * columns + VOCABULARY + unit] ?? 0) * (h[unit] ?? 0);
        }
        z[row] = sum;
      }
      const nextH = new Float64Array(memory);
      if (gated) {
        const c = cs.at(-1) as Float64Array;
        const nextC = new Float64Array(memory);
        const act = new Float64Array(rows);
        for (let unit = 0; unit < memory; unit += 1) {
          act[unit] = chance(z[unit] ?? 0);
          act[memory + unit] = chance(z[memory + unit] ?? 0);
          act[2 * memory + unit] = chance(z[2 * memory + unit] ?? 0);
          act[3 * memory + unit] = Math.tanh(z[3 * memory + unit] ?? 0);
          nextC[unit] =
            (act[memory + unit] ?? 0) * (c[unit] ?? 0) +
            (act[unit] ?? 0) * (act[3 * memory + unit] ?? 0);
          nextH[unit] = (act[2 * memory + unit] ?? 0) * Math.tanh(nextC[unit] ?? 0);
        }
        acts.push(act);
        cs.push(nextC);
      } else {
        for (let unit = 0; unit < memory; unit += 1) nextH[unit] = Math.tanh(z[unit] ?? 0);
      }
      hs.push(nextH);
    }
    const last = hs.at(-1) as Float64Array;
    let score = params[answer + memory] ?? 0;
    for (let unit = 0; unit < memory; unit += 1)
      score += (params[answer + unit] ?? 0) * (last[unit] ?? 0);
    const p = chance(score);
    loss += -(rainy ? Math.log(Math.max(p, 1e-12)) : Math.log(Math.max(1 - p, 1e-12)));
    const dScore = p - rainy;
    gradient[answer + memory] = (gradient[answer + memory] ?? 0) + dScore;
    let dh = new Float64Array(memory);
    for (let unit = 0; unit < memory; unit += 1) {
      gradient[answer + unit] = (gradient[answer + unit] ?? 0) + dScore * (last[unit] ?? 0);
      dh[unit] = dScore * (params[answer + unit] ?? 0);
    }
    let dc = new Float64Array(memory);
    // Backward through the words.
    for (let t = sentence.length - 1; t >= 0; t -= 1) {
      const word = sentence[t] ?? 0;
      const hPrev = hs[t] as Float64Array;
      const dz = new Float64Array(rows);
      if (gated) {
        const act = acts[t] as Float64Array;
        const cNow = cs[t + 1] as Float64Array;
        const cPrev = cs[t] as Float64Array;
        const nextDc = new Float64Array(memory);
        for (let unit = 0; unit < memory; unit += 1) {
          const letIn = act[unit] ?? 0;
          const keep = act[memory + unit] ?? 0;
          const readOut = act[2 * memory + unit] ?? 0;
          const fresh = act[3 * memory + unit] ?? 0;
          const squashed = Math.tanh(cNow[unit] ?? 0);
          const dStore = (dc[unit] ?? 0) + (dh[unit] ?? 0) * readOut * (1 - squashed * squashed);
          dz[unit] = dStore * fresh * letIn * (1 - letIn);
          dz[memory + unit] = dStore * (cPrev[unit] ?? 0) * keep * (1 - keep);
          dz[2 * memory + unit] = (dh[unit] ?? 0) * squashed * readOut * (1 - readOut);
          dz[3 * memory + unit] = dStore * letIn * (1 - fresh * fresh);
          nextDc[unit] = dStore * keep;
        }
        dc = nextDc;
      } else {
        const h = hs[t + 1] as Float64Array;
        for (let unit = 0; unit < memory; unit += 1)
          dz[unit] = (dh[unit] ?? 0) * (1 - (h[unit] ?? 0) * (h[unit] ?? 0));
      }
      const nextDh = new Float64Array(memory);
      for (let row = 0; row < rows; row += 1) {
        const d = dz[row] ?? 0;
        if (d === 0) continue;
        gradient[bias + row] = (gradient[bias + row] ?? 0) + d;
        gradient[row * columns + word] = (gradient[row * columns + word] ?? 0) + d;
        for (let unit = 0; unit < memory; unit += 1) {
          gradient[row * columns + VOCABULARY + unit] =
            (gradient[row * columns + VOCABULARY + unit] ?? 0) + d * (hPrev[unit] ?? 0);
          nextDh[unit] = (nextDh[unit] ?? 0) + d * (params[row * columns + VOCABULARY + unit] ?? 0);
        }
      }
      dh = nextDh;
    }
  }
  const scale = 1 / Math.max(1, data.length);
  for (let index = 0; index < gradient.length; index += 1)
    gradient[index] = (gradient[index] ?? 0) * scale;
  return { loss: loss * scale, gradient };
}

/** Steps bigger than this (all numbers together) are cut down, so big steps stay finite. */
const LONGEST_STEP = 5;

/** Adam on the whole set of examples, one round at a time. */
export function createSequenceTrainer(
  spec: SequenceSpec,
  start: Float64Array,
  data: readonly Example[],
  learningRate: number,
) {
  const params = Float64Array.from(start);
  const first = new Float64Array(params.length);
  const second = new Float64Array(params.length);
  let rounds = 0;
  return {
    params,
    round(): number {
      const { loss, gradient } = lossAndGradient(spec, params, data);
      let norm = 0;
      for (const value of gradient) norm += value * value;
      norm = Math.sqrt(norm);
      const cut = norm > LONGEST_STEP ? LONGEST_STEP / norm : 1;
      rounds += 1;
      const fix1 = 1 - 0.9 ** rounds;
      const fix2 = 1 - 0.999 ** rounds;
      for (let index = 0; index < params.length; index += 1) {
        const g = (gradient[index] ?? 0) * cut;
        first[index] = 0.9 * (first[index] ?? 0) + 0.1 * g;
        second[index] = 0.999 * (second[index] ?? 0) + 0.001 * g * g;
        params[index] =
          (params[index] ?? 0) -
          (learningRate * ((first[index] ?? 0) / fix1)) /
            (Math.sqrt((second[index] ?? 0) / fix2) + 1e-8);
      }
      return loss;
    },
  };
}

/** Share of examples answered right (more than half sure of the right thing). */
export function accuracy(
  spec: SequenceSpec,
  params: ArrayLike<number>,
  data: readonly Example[],
  gates: Gates = FREE_GATES,
): number {
  let right = 0;
  for (const { sentence, rainy } of data) {
    const { rainy: said } = read(spec, params, sentence, gates);
    if ((said > 0.5 ? 1 : 0) === rainy) right += 1;
  }
  return right / Math.max(1, data.length);
}

/**
 * How much the cell still remembers the first word after each word: the gap between its whole
 * state (memory and store) after reading the sunny and the rainy versions of one sentence.
 */
export function remembering(
  spec: SequenceSpec,
  params: ArrayLike<number>,
  rest: readonly number[],
  gates: Gates = FREE_GATES,
): number[] {
  const sunny = read(spec, params, [0, ...rest], gates);
  const rainy = read(spec, params, [1, ...rest], gates);
  return sunny.memories.map((memory, index) => {
    let sum = 0;
    const other = rainy.memories[index] as Float64Array;
    for (let unit = 0; unit < memory.length; unit += 1)
      sum += ((memory[unit] ?? 0) - (other[unit] ?? 0)) ** 2;
    const store = sunny.stores[index];
    const otherStore = rainy.stores[index];
    if (store && otherStore) {
      for (let unit = 0; unit < store.length; unit += 1)
        sum += ((store[unit] ?? 0) - (otherStore[unit] ?? 0)) ** 2;
    }
    return Math.sqrt(sum);
  });
}

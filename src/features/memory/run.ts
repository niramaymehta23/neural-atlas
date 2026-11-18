/**
 * The practice run both memory lessons share ("Reading one word at a time" and "Choosing what to
 * remember"): a cell practises on sunny/rainy sentences of one length, seeded, so the same settings
 * always give the same run and a link replays it exactly. Words are the lessons' business: the
 * story here is word numbers, which each lesson spells from its own captions.
 */
import {
  accuracy,
  createSequenceTrainer,
  examples,
  read,
  remembering,
  startParams,
  type Cell,
  type Example,
  type Gates,
} from "@/engine/sequence/recurrent";
import type { TimelineFrame } from "@/platform/contract";

export const LENGTH = { min: 3, max: 20 };
/** From this many words on, a sentence counts as long (the plain cell forgets from here). */
export const LONG = 12;
/** Practice rounds in one run, and how many moments of it are recorded. */
export const ROUNDS = 240;
const MOMENTS = 60;
const SEED = 5;
const SPREAD = 0.5;
/** "How big a step" runs over these step sizes, growing faster than the dial. */
const STEP_RANGE = { min: 0.002, max: 0.015 };
/** Right on more than this share of new sentences: it remembers. */
export const REMEMBERS = 0.9;
/** Right on less than this share: it is only guessing. */
export const GUESSING = 0.65;
/** A memory gap this big or bigger shows as a full bead. */
const FULL_BEAD = 1;

/**
 * The sentence the scene shows after its first word, as filler-word numbers (0–15): "and then we
 * went to the park and saw a big dog so we all ran back home and". Every lesson spells fillers the
 * same way, in this order: and, then, we, went, to, the, park, saw, a, big, dog, so, all, ran, back,
 * home.
 */
export const STORY = [0, 1, 2, 3, 4, 5, 6, 0, 7, 8, 9, 10, 11, 2, 12, 13, 14, 15, 0];
/** The engine numbers words with the two first words before the fillers. */
const FIRST_FILLER = 2;

export const stepSize = (dial: number) =>
  STEP_RANGE.min * (STEP_RANGE.max / STEP_RANGE.min) ** Math.min(1, Math.max(0, dial));

export type MemoryFrame = TimelineFrame & {
  key: string;
  params: number[];
  rounds: number;
  /** Share of new sentences it answers right, with every gate deciding for itself. */
  right: number;
};

const sets = new Map<string, Example[]>();
function setOf(length: number, count: number, seed: number) {
  const key = `${length}|${count}|${seed}`;
  let set = sets.get(key);
  if (!set) {
    set = examples(length, count, seed);
    sets.set(key, set);
  }
  return set;
}

/** The sentences it practises on, and the new ones it is checked on. */
export const practiceSet = (length: number) => setOf(length, 32, 11);
export const newSentences = (length: number) => setOf(length, 40, 101);

/** Every moment of the practice run, the untrained cell first. */
export function* memoryRun(
  cell: Cell,
  length: number,
  step: number,
  key: string,
): Generator<MemoryFrame> {
  const spec = { cell };
  const trainer = createSequenceTrainer(
    spec,
    startParams(spec, SEED, SPREAD),
    practiceSet(length),
    stepSize(step),
  );
  const check = newSentences(length);
  const every = Math.ceil(ROUNDS / MOMENTS);
  let loss = Number.NaN;
  const frame = (epoch: number): MemoryFrame => ({
    epoch,
    key,
    loss: Number.isFinite(loss) ? loss : Math.LN2,
    params: Array.from(trainer.params),
    rounds: ROUNDS,
    right: accuracy(spec, trainer.params, check),
  });
  yield frame(0);
  for (let epoch = 1; epoch <= ROUNDS; epoch += 1) {
    loss = trainer.round();
    if (epoch % every === 0 || epoch === ROUNDS) yield frame(epoch);
  }
}

/** The untrained cell, for the strip before any practice. */
export const untrained = (cell: Cell) => Array.from(startParams({ cell }, SEED, SPREAD));

/** The shown sentence's filler words for a sentence of `length` words. */
export const storyOf = (length: number) => STORY.slice(0, Math.max(0, length - 1));

export type StripReading = {
  /** How much it still remembers the first word after each word, 0–1. */
  beads: number[];
  /** Gated cell only: how open each gate was at each word. */
  openness: { keep: number; letIn: number; readOut: number }[];
  /** How sure it is that the answer is the rainy one, 0–1. */
  rainy: number;
};

/** What the strip shows for the story sentence starting `rainy` (or sunny). */
export function readStory(
  cell: Cell,
  params: ArrayLike<number>,
  length: number,
  rainy: boolean,
  gates?: Gates,
): StripReading {
  const rest = storyOf(length).map((word) => word + FIRST_FILLER);
  const gaps = remembering({ cell }, params, rest, gates);
  const { rainy: sure, openness } = read({ cell }, params, [rainy ? 1 : 0, ...rest], gates);
  return {
    beads: gaps.map((value) => Math.min(1, value / FULL_BEAD)),
    openness,
    rainy: sure,
  };
}

/** Share of new sentences answered right with the gates as set (the gated cell only). */
export const rightWith = (cell: Cell, params: ArrayLike<number>, length: number, gates: Gates) =>
  accuracy({ cell }, params, newSentences(length), gates);

export type Memory = "remembers" | "some" | "guessing";
export const memoryOf = (right: number): Memory =>
  right > REMEMBERS ? "remembers" : right < GUESSING ? "guessing" : "some";

/** How sure an answer is, in three steps. */
export type Sureness = "sure" | "fairly" | "guessing";
export function surenessOf(rainy: number): Sureness {
  const away = Math.abs(rainy - 0.5);
  return away > 0.4 ? "sure" : away > 0.15 ? "fairly" : "guessing";
}

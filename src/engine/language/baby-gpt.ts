/**
 * Baby GPT's practice run: a letter-level tiny GPT reads one text over and over, guessing each next
 * letter, starting from fresh weights ("Reading the internet") or from the pretrained writer
 * ("Specialising"). Every step's batch comes from (seed, step), and every moment's measurements are
 * taken on fixed windows, so a run is the same however its steps are sliced: a link replays it.
 */
import { createRandom } from "../random";
import { chancesOf, pick } from "./sampling";
import {
  createAdam,
  createGpt,
  freshGpt,
  nextScores,
  surpriseOf,
  trainStep,
  type GptShape,
} from "./tiny-gpt";

export type WriterRunConfig = {
  shape: GptShape;
  /** Starting weights; null starts fresh from `seed`. */
  base: Float32Array | null;
  /** The text practised on, as letter ids (at least two). */
  text: readonly number[];
  /** Text it read before, to measure how much of it is kept; null when there is none. */
  everyday: readonly number[] | null;
  learningRate: number;
  batch: number;
  seed: number;
  /** What each moment's sample starts with. */
  prompt: readonly number[];
  /** Letters written after the prompt for each moment's sample. */
  sampleLength: number;
};

export type WriterMoment = {
  step: number;
  /** Mean surprise on the practice text's fixed windows. */
  loss: number;
  /** Mean surprise on the earlier text's fixed windows, or null. */
  everyday: number | null;
  /** The prompt and what it wrote after it. */
  sample: number[];
};

/** Steps between recorded moments. */
export const MOMENT_EVERY = 25;
/** How adventurous the samples are (a little safer than picking by the chances as they are). */
const SAMPLE_HEAT = 0.8;
/** Windows each measurement reads. */
const WINDOWS = 6;

/** Up to `count` evenly spread windows of `ids`, each `size` long (or the whole text if shorter). */
function windowsOf(ids: readonly number[], size: number, count: number): number[][] {
  if (ids.length <= size) return [[...ids]];
  const last = ids.length - size;
  const starts = new Set(
    Array.from({ length: count }, (_, at) => Math.round((last * at) / Math.max(1, count - 1))),
  );
  return [...starts].map((start) => ids.slice(start, start + size));
}

export function createWriterRun(config: WriterRunConfig) {
  if (config.text.length < 2) throw new Error("Baby GPT needs at least two letters to read.");
  const model = config.base
    ? createGpt(config.shape, Float32Array.from(config.base))
    : freshGpt(config.shape, config.seed);
  const adam = createAdam(model);
  const size = Math.min(config.shape.context, config.text.length);
  const practice = windowsOf(config.text, size, WINDOWS);
  const earlier =
    config.everyday && config.everyday.length >= 2
      ? windowsOf(config.everyday, Math.min(config.shape.context, config.everyday.length), WINDOWS)
      : null;
  let step = 0;

  const mean = (windows: number[][]) =>
    windows.reduce((sum, ids) => sum + surpriseOf(model, ids), 0) / windows.length;

  function write(): number[] {
    const random = createRandom(config.seed * 31 + step);
    const ids = [...config.prompt];
    for (let at = 0; at < config.sampleLength; at += 1) {
      ids.push(pick(chancesOf(nextScores(model, ids), { heat: SAMPLE_HEAT }), random.next()));
    }
    return ids;
  }

  return {
    get step() {
      return step;
    },
    /** One practice step on a batch drawn from (seed, step). */
    advance() {
      const random = createRandom(config.seed * 7919 + step);
      const batch = Array.from({ length: config.batch }, () => {
        const start = random.int(config.text.length - size + 1);
        return config.text.slice(start, start + size);
      });
      trainStep(model, adam, batch, { learningRate: config.learningRate });
      step += 1;
    },
    moment(): WriterMoment {
      return {
        step,
        loss: mean(practice),
        everyday: earlier ? mean(earlier) : null,
        sample: write(),
      };
    },
  };
}

export type WriterRun = ReturnType<typeof createWriterRun>;

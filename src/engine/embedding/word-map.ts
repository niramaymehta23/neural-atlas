/**
 * A word map learned from sentences: every word gets a place on a flat map, and so does every word
 * as a neighbour. Each word is pulled towards the neighbours it shares a sentence with and pushed
 * away from a few neighbours drawn at random. Words that keep the same company end up close
 * together. Pure and seeded: the same sentences and settings give the same map.
 */
import { createRandom } from "../random";

export type WordMapSettings = {
  /** How strongly words are pushed away from random neighbours (0: never). */
  push: number;
  /** Step size. */
  step: number;
  /** Random neighbours pushed away for every real one. */
  pushes: number;
};

export type WordMapMoment = {
  round: number;
  /** x, y for every word in `vocabulary` order. */
  places: number[];
  /** The mean pull still to go: lower once words sit near their neighbours. */
  strain: number;
};

/** Every word of the sentences, in first-seen order. */
export const vocabularyOf = (sentences: readonly (readonly string[])[]) => [
  ...new Set(sentences.flat()),
];

/** Pairs of word and neighbour (by index) that share a sentence. */
export function pairsOf(sentences: readonly (readonly string[])[], vocabulary: readonly string[]) {
  const index = new Map(vocabulary.map((word, at) => [word, at]));
  const pairs: [number, number][] = [];
  for (const sentence of sentences) {
    for (const word of sentence) {
      for (const other of sentence) {
        if (word !== other) pairs.push([index.get(word) ?? 0, index.get(other) ?? 0]);
      }
    }
  }
  return pairs;
}

const FLOOR = 0.01;

/**
 * The map, moment by moment: `rounds` passes over every pair, a moment at the start and every
 * `every` rounds. Places start scattered in −0.5…0.5.
 */
export function* learnWordMap(
  sentences: readonly (readonly string[])[],
  settings: WordMapSettings,
  seed: number,
  rounds: number,
  every: number,
): Generator<WordMapMoment> {
  const random = createRandom(seed);
  const vocabulary = vocabularyOf(sentences);
  const size = vocabulary.length;
  const words = Float64Array.from({ length: size * 2 }, () => random.range(-0.5, 0.5));
  const neighbours = Float64Array.from({ length: size * 2 }, () => random.range(-0.5, 0.5));
  const pairs = pairsOf(sentences, vocabulary);
  const order = pairs.map((_, at) => at);
  const round3 = (value: number) => Math.round(value * 1000) / 1000;
  const moment = (round: number, strain: number): WordMapMoment => ({
    round,
    places: Array.from(words, round3),
    strain,
  });

  /** Moves word `w` and neighbour `n` together (pull) or apart (push, scaled by `weight`). */
  const nudge = (w: number, n: number, pull: boolean, weight: number) => {
    const dx = (words[w * 2] ?? 0) - (neighbours[n * 2] ?? 0);
    const dy = (words[w * 2 + 1] ?? 0) - (neighbours[n * 2 + 1] ?? 0);
    const d2 = dx * dx + dy * dy;
    // Pull: the gradient of log(1 + d²). Push: of −log(d² / (1 + d²)), which fades with distance.
    const factor = pull ? 2 / (1 + d2) : -2 * (1 / (d2 + FLOOR) - 1 / (1 + d2));
    const move = settings.step * weight * factor;
    words[w * 2] = (words[w * 2] ?? 0) - move * dx;
    words[w * 2 + 1] = (words[w * 2 + 1] ?? 0) - move * dy;
    neighbours[n * 2] = (neighbours[n * 2] ?? 0) + move * dx;
    neighbours[n * 2 + 1] = (neighbours[n * 2 + 1] ?? 0) + move * dy;
    return d2;
  };

  yield moment(0, 1);
  for (let round = 1; round <= rounds; round += 1) {
    // A seeded shuffle of the pairs each round.
    for (let at = order.length - 1; at > 0; at -= 1) {
      const swap = random.int(at + 1);
      [order[at], order[swap]] = [order[swap] ?? 0, order[at] ?? 0];
    }
    let strain = 0;
    for (const at of order) {
      const [w, n] = pairs[at] ?? [0, 0];
      strain += Math.log1p(nudge(w, n, true, 1));
      for (let push = 0; push < settings.pushes; push += 1) {
        const other = random.int(size);
        if (other !== n && settings.push > 0) nudge(w, other, false, settings.push);
      }
    }
    if (round % every === 0 || round === rounds) {
      yield moment(round, pairs.length > 0 ? strain / pairs.length : 0);
    }
  }
}

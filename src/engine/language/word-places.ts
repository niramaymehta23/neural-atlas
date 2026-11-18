/**
 * GloVe word places (public/models/glove-words-v1): 50 numbers per word, scaled to length one, so
 * how alike two words are is how closely their arrows point the same way (cosine similarity).
 */

export const DIMENSIONS = 50;

export type WordPlaces = {
  words: readonly string[];
  /** Every word's unit-length vector, word after word. */
  vectors: Float32Array;
  index: ReadonlyMap<string, number>;
};

/** Reads `words.txt` and `vectors.bin` (int8 codes, then one float32 scale per word). */
export function readWordPlaces(wordsText: string, bytes: ArrayBuffer): WordPlaces {
  const words = wordsText.split("\n").filter(Boolean);
  const count = words.length;
  if (bytes.byteLength !== count * DIMENSIONS + count * 4) {
    throw new Error("The word places file does not match its word list.");
  }
  const codes = new Int8Array(bytes, 0, count * DIMENSIONS);
  const scales = new Float32Array(bytes, count * DIMENSIONS, count);
  const vectors = new Float32Array(count * DIMENSIONS);
  for (let word = 0; word < count; word += 1) {
    let length = 0;
    for (let d = 0; d < DIMENSIONS; d += 1) {
      const value = (codes[word * DIMENSIONS + d] ?? 0) * (scales[word] ?? 0);
      vectors[word * DIMENSIONS + d] = value;
      length += value * value;
    }
    const norm = Math.sqrt(length) || 1;
    for (let d = 0; d < DIMENSIONS; d += 1) {
      const at = word * DIMENSIONS + d;
      vectors[at] = (vectors[at] ?? 0) / norm;
    }
  }
  return { words, vectors, index: new Map(words.map((word, at) => [word, at])) };
}

/** A word's unit vector, or null when the map does not know it. */
export function vectorOf(places: WordPlaces, word: string): Float32Array | null {
  const at = places.index.get(word.toLowerCase());
  return at === undefined ? null : places.vectors.subarray(at * DIMENSIONS, (at + 1) * DIMENSIONS);
}

export function unit(vector: Float32Array): Float32Array {
  let length = 0;
  for (const value of vector) length += value * value;
  const norm = Math.sqrt(length) || 1;
  return vector.map((value) => value / norm);
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let d = 0; d < a.length; d += 1) {
    dot += (a[d] ?? 0) * (b[d] ?? 0);
    aa += (a[d] ?? 0) ** 2;
    bb += (b[d] ?? 0) ** 2;
  }
  return aa === 0 || bb === 0 ? 0 : dot / Math.sqrt(aa * bb);
}

export type Near = { word: string; likeness: number };

/** The `count` words pointing most like `vector`, skipping `skip`. */
export function nearest(
  places: WordPlaces,
  vector: ArrayLike<number>,
  count: number,
  skip: ReadonlySet<string> = new Set(),
): Near[] {
  const query = unit(Float32Array.from(vector));
  const best: Near[] = [];
  places.words.forEach((word, at) => {
    if (skip.has(word)) return;
    let likeness = 0;
    for (let d = 0; d < DIMENSIONS; d += 1) {
      likeness += (places.vectors[at * DIMENSIONS + d] ?? 0) * (query[d] ?? 0);
    }
    if (best.length < count || likeness > (best.at(-1)?.likeness ?? -Infinity)) {
      best.push({ word, likeness });
      best.sort((a, b) => b.likeness - a.likeness || a.word.localeCompare(b.word));
      if (best.length > count) best.pop();
    }
  });
  return best;
}

/** `from` − `minus` + `plus`, following the arrow `amount` of the way (1 is the whole arrow). */
export function analogy(
  places: WordPlaces,
  from: string,
  minus: string,
  plus: string,
  amount = 1,
): Float32Array | null {
  const a = vectorOf(places, from);
  const b = vectorOf(places, minus);
  const c = vectorOf(places, plus);
  if (!a || !b || !c) return null;
  return a.map((value, d) => value + amount * ((c[d] ?? 0) - (b[d] ?? 0)));
}

/** The average place of the words of `text` the map knows, or null when it knows none. */
export function meaningOf(places: WordPlaces, text: string): Float32Array | null {
  const sum = new Float32Array(DIMENSIONS);
  let known = 0;
  for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    const vector = vectorOf(places, word);
    if (!vector) continue;
    known += 1;
    for (let d = 0; d < DIMENSIONS; d += 1) sum[d] = (sum[d] ?? 0) + (vector[d] ?? 0);
  }
  return known === 0 ? null : unit(sum);
}

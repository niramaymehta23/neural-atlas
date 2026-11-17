/**
 * Turning a model's raw attention into word-to-word threads people can read: the learner's own
 * words (each made of one or more model pieces), the sentence markers and each word's look at
 * itself left out, and every word's looks shared out to 1.
 */

/** Words read at most; the rest of a longer sentence is left unread (and the scene says so). */
export const MOST_WORDS = 16;
/** Letters read at most, so a hand-made link can never hand the model a huge sentence. */
export const MOST_LETTERS = 90;

/** One sentence read by the model: the learner's words and every layer's and reader's attention. */
export type Reading = {
  /** The words as the learner typed them, punctuation and capitals kept. */
  words: string[];
  /** How many model pieces each word became (0 for one the model skips entirely). */
  pieces: number[];
  /**
   * layers × heads × size × size, with size = 2 + all the pieces ([CLS] first, [SEP] last);
   * row = who looks, column = at whom.
   */
  weights: Float32Array;
  layers: number;
  heads: number;
};

/** looks[from][to]: the share of `from`'s looking that lands on `to`; each row sums to 1 (or 0). */
export type Threads = { words: string[]; looks: number[][] };

/** The words a sentence is read as: split on spaces, at most MOST_WORDS of them. */
export function wordsOf(sentence: string): string[] {
  return sentence.slice(0, MOST_LETTERS).split(/\s+/u).filter(Boolean).slice(0, MOST_WORDS);
}

/** True when the sentence has more words than are read. */
export function hasUnreadWords(sentence: string): boolean {
  return sentence.slice(0, MOST_LETTERS).split(/\s+/u).filter(Boolean).length > MOST_WORDS;
}

/** The sentence exactly as it is read: its words, one space apart. */
export function readable(sentence: string): string {
  return wordsOf(sentence).join(" ");
}

/** A word with its punctuation and capitals dropped, for comparing ("Tired." is "tired"). */
export function plain(word: string): string {
  return word.toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]/gu, "");
}

/** A word with a letter or digit in it, not just punctuation or a picture. */
export function isRealWord(word: string): boolean {
  return plain(word).length > 0;
}

/** Which word each model token belongs to (null for the markers). */
function owners(pieces: readonly number[]): (number | null)[] {
  return [null, ...pieces.flatMap((count, word) => new Array<number>(count).fill(word)), null];
}

/** Every layer, or every reader, as a list of indices. */
const every = (count: number) => [...Array(count).keys()];

/**
 * The threads blended over `depths` (layers, from 0) and `readers` (heads, from 0). A word made
 * of pieces looks with their average and is looked at with their sum; out-of-range indices are
 * clamped to what the model has.
 */
export function blendThreads(
  reading: Reading,
  depths: readonly number[],
  readers: readonly number[],
): Threads {
  const { words, pieces, weights, layers, heads } = reading;
  const owner = owners(pieces);
  const size = owner.length;
  const clampTo = (count: number) => (index: number) => Math.min(count - 1, Math.max(0, index));
  const looks = words.map(() => new Array<number>(words.length).fill(0));
  for (const layer of new Set(depths.map(clampTo(layers))))
    for (const head of new Set(readers.map(clampTo(heads)))) {
      const base = (layer * heads + head) * size * size;
      for (let from = 0; from < size; from += 1) {
        const fromWord = owner[from];
        if (fromWord === undefined || fromWord === null) continue;
        const row = looks[fromWord];
        if (!row) continue;
        for (let to = 0; to < size; to += 1) {
          const toWord = owner[to];
          if (toWord === undefined || toWord === null || toWord === fromWord) continue;
          row[toWord] = (row[toWord] ?? 0) + (weights[base + from * size + to] ?? 0);
        }
      }
    }
  // Averaging over layers, readers and pieces cancels out once each row is shared out to 1.
  for (const row of looks) {
    const total = row.reduce((sum, value) => sum + value, 0);
    if (total > 0) row.forEach((value, index) => (row[index] = value / total));
  }
  return { words, looks };
}

/**
 * The threads at one depth (layer, from 0) for one reader (head), or all readers blended when
 * `reader` is null.
 */
export function wordThreads(reading: Reading, depth: number, reader: number | null): Threads {
  return blendThreads(reading, [depth], reader === null ? every(reading.heads) : [reader]);
}

/** The word that receives the biggest share of everyone else's looking, and that share (0–1). */
export function hogShare({ looks }: Threads): { word: number; share: number } {
  const others = looks.length - 1;
  let best = { word: 0, share: 0 };
  if (others < 1) return best;
  for (let to = 0; to < looks.length; to += 1) {
    const share = looks.reduce((sum, row) => sum + (row[to] ?? 0), 0) / others;
    if (share > best.share) best = { word: to, share };
  }
  return best;
}

/** Of `candidates` (word indices), the one `from` looks at most; null without candidates. */
export function mostLookedAt(
  { looks }: Threads,
  from: number,
  candidates: readonly number[],
): number | null {
  const row = looks[from];
  if (!row || candidates.length === 0) return null;
  return candidates.reduce((best, word) => ((row[word] ?? 0) > (row[best] ?? 0) ? word : best));
}

/** The words `from` looks at, strongest first, faint ones left out. */
export function favourites({ looks }: Threads, from: number, faint = 0): number[] {
  const row = looks[from] ?? [];
  return every(row.length)
    .filter((to) => to !== from && (row[to] ?? 0) > faint)
    .sort((a, b) => (row[b] ?? 0) - (row[a] ?? 0) || a - b);
}

/** What a reader mostly does in one sentence, so it can be named by its habit. */
export type Habit =
  { kind: "next" } | { kind: "before" } | { kind: "one"; word: number } | { kind: "around" };

/** A habit counts once it takes at least this share of the looking. */
const HABIT = 0.4;

/** A reader's habit, read off its threads: next word, word before, one word, or all around. */
export function habitOf(threads: Threads): Habit {
  const { looks } = threads;
  const count = looks.length;
  if (count < 3) return { kind: "around" };
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const look = (from: number, to: number) => looks[from]?.[to] ?? 0;
  const next = mean(every(count - 1).map((from) => look(from, from + 1)));
  const before = mean(every(count - 1).map((from) => look(from + 1, from)));
  const hog = hogShare(threads);
  const best = Math.max(next, before, hog.share);
  if (best < HABIT) return { kind: "around" };
  if (best === next) return { kind: "next" };
  if (best === before) return { kind: "before" };
  return { kind: "one", word: hog.word };
}

/**
 * Turning a model's raw attention into word-to-word threads people can read: word pieces joined
 * back into words, the sentence markers and each word's look at itself left out, and every word's
 * looks shared out to 1.
 */

/** One sentence read by the model: its tokens and every layer's and reader's attention. */
export type Reading = {
  /** Model tokens, markers ([CLS], [SEP]) and word pieces ("##s") included. */
  tokens: string[];
  /** layers × heads × tokens × tokens, row = who looks, column = at whom. */
  weights: Float32Array;
  layers: number;
  heads: number;
};

/** looks[from][to]: the share of `from`'s attention that lands on `to`; each row sums to 1. */
export type Threads = { words: string[]; looks: number[][] };

const MARKERS = new Set(["[CLS]", "[SEP]", "[PAD]"]);
const PIECE = "##";

/** Which word each token belongs to (null for markers), and the words themselves. */
function groupWords(tokens: readonly string[]) {
  const words: string[] = [];
  const owner = tokens.map((token) => {
    if (MARKERS.has(token)) return null;
    if (token.startsWith(PIECE) && words.length > 0) {
      words[words.length - 1] += token.slice(PIECE.length);
      return words.length - 1;
    }
    words.push(token);
    return words.length - 1;
  });
  return { words, owner };
}

/**
 * The threads at one depth (layer, from 0) for one reader (head), or all readers blended when
 * `reader` is null. A word made of pieces looks with their average and is looked at with their sum.
 */
export function wordThreads(reading: Reading, depth: number, reader: number | null): Threads {
  const { tokens, weights, layers, heads } = reading;
  const size = tokens.length;
  const layer = Math.min(layers - 1, Math.max(0, depth));
  const chosen = reader === null ? [...Array(heads).keys()] : [Math.min(heads - 1, reader)];
  const { words, owner } = groupWords(tokens);
  const looks = words.map(() => new Array<number>(words.length).fill(0));
  const pieces = new Array<number>(words.length).fill(0);
  for (const word of owner) if (word !== null) pieces[word] = (pieces[word] ?? 0) + 1;

  for (const head of chosen) {
    const base = (layer * heads + head) * size * size;
    for (let from = 0; from < size; from += 1) {
      const fromWord = owner[from];
      if (fromWord === undefined || fromWord === null) continue;
      const row = looks[fromWord] ?? [];
      for (let to = 0; to < size; to += 1) {
        const toWord = owner[to];
        if (toWord === undefined || toWord === null || toWord === fromWord) continue;
        row[toWord] = (row[toWord] ?? 0) + (weights[base + from * size + to] ?? 0);
      }
    }
  }
  // Averaging over readers and pieces cancels out once each row is shared out to 1.
  for (const row of looks) {
    const total = row.reduce((sum, value) => sum + value, 0);
    if (total > 0) row.forEach((value, index) => (row[index] = value / total));
  }
  return { words, looks };
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

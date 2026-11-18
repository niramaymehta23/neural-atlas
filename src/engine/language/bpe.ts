/**
 * GPT-2's byte-pair pieces: text is split into rough words, each word into its UTF-8 bytes, and the
 * learned merges glue neighbouring bytes back together, best-known pair first. Two limits let a
 * lesson show a smaller vocabulary: only the first `known` merges are used, and a merge whose result
 * would be longer than `longest` bytes is skipped. With no limits this matches GPT-2 exactly.
 */

/** GPT-2's rough-word rule (the same one its tokenizer uses before merging). */
const ROUGH_WORDS = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

/** GPT-2 writes each byte as a printable character, so merges can be stored as text. */
function byteLetters(): string[] {
  const kept: number[] = [];
  for (let byte = 33; byte <= 126; byte += 1) kept.push(byte);
  for (let byte = 161; byte <= 172; byte += 1) kept.push(byte);
  for (let byte = 174; byte <= 255; byte += 1) kept.push(byte);
  const letters: string[] = [];
  let extra = 0;
  for (let byte = 0; byte < 256; byte += 1) {
    const code = kept.includes(byte) ? byte : 256 + extra++;
    letters[byte] = String.fromCodePoint(code);
  }
  return letters;
}

const LETTERS = byteLetters();
const BYTE_OF = new Map(LETTERS.map((letter, byte) => [letter, byte]));

export type PieceSet = {
  /** Merge rank of "left right", 0 first. */
  ranks: Map<string, number>;
  /** Piece id of each piece's byte letters. */
  ids: Map<string, number>;
  merges: number;
};

/** Reads GPT-2's `vocab.json` and `merges.txt`. */
export function readPieceSet(vocabJson: string, mergesText: string): PieceSet {
  const vocab = JSON.parse(vocabJson) as Record<string, number>;
  const ranks = new Map<string, number>();
  for (const line of mergesText.split("\n")) {
    if (line.startsWith("#version") || !line.includes(" ")) continue;
    ranks.set(line.trim(), ranks.size);
  }
  return { ranks, ids: new Map(Object.entries(vocab)), merges: ranks.size };
}

export type Piece = {
  /** The piece's bytes. */
  bytes: number[];
  /** GPT-2's id for it. */
  id: number;
  /** The piece as text, or null when it is only part of a letter (a letter's bytes were split). */
  text: string | null;
};

export type Limits = { known?: number; longest?: number };

const DECODER = new TextDecoder("utf-8", { fatal: true });

function asText(bytes: readonly number[]): string | null {
  try {
    return DECODER.decode(new Uint8Array(bytes));
  } catch {
    return null;
  }
}

/** Merges one rough word's byte letters as far as the limits allow. */
function mergeWord(set: PieceSet, letters: string[], known: number, longest: number): string[] {
  const parts = [...letters];
  for (;;) {
    let best = -1;
    let bestRank = Infinity;
    for (let at = 0; at < parts.length - 1; at += 1) {
      const rank = set.ranks.get(`${parts[at]} ${parts[at + 1]}`);
      if (rank === undefined || rank >= known || rank >= bestRank) continue;
      if ([...(parts[at] ?? "")].length + [...(parts[at + 1] ?? "")].length > longest) continue;
      best = at;
      bestRank = rank;
    }
    if (best < 0) return parts;
    const left = parts[best];
    const right = parts[best + 1];
    // Merge every place this pair sits, left to right, as GPT-2 does.
    const merged: string[] = [];
    for (let at = 0; at < parts.length; at += 1) {
      if (at < parts.length - 1 && parts[at] === left && parts[at + 1] === right) {
        merged.push(`${left}${right}`);
        at += 1;
      } else merged.push(parts[at] ?? "");
    }
    parts.splice(0, parts.length, ...merged);
  }
}

const ENCODER = new TextEncoder();

/** The pieces of `text`, in order. */
export function piecesOf(set: PieceSet, text: string, limits: Limits = {}): Piece[] {
  const known = limits.known ?? set.merges;
  const longest = limits.longest ?? Infinity;
  const pieces: Piece[] = [];
  for (const [word] of text.matchAll(ROUGH_WORDS)) {
    const letters = [...ENCODER.encode(word)].map((byte) => LETTERS[byte] ?? "");
    for (const part of mergeWord(set, letters, known, longest)) {
      const bytes = [...part].map((letter) => BYTE_OF.get(letter) ?? 0);
      pieces.push({ bytes, id: set.ids.get(part) ?? -1, text: asText(bytes) });
    }
  }
  return pieces;
}

/** How many letters (characters as people count them) `text` has. */
export function letterCount(text: string): number {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
}

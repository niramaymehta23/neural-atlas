// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PreTrainedTokenizer } from "@huggingface/transformers";
import { letterCount, piecesOf, readPieceSet } from "./bpe";

const folder = join(process.cwd(), "public", "models", "gpt2-pieces-v1");
const vocab = readFileSync(join(folder, "vocab.json"), "utf8");
const merges = readFileSync(join(folder, "merges.txt"), "utf8");
const set = readPieceSet(vocab, merges);

/** Transformers.js's own GPT-2 tokenizer, built from the same two files. */
const reference = new PreTrainedTokenizer(
  {
    model: {
      type: "BPE",
      vocab: JSON.parse(vocab) as Record<string, number>,
      merges: merges
        .split("\n")
        .filter((line) => line && !line.startsWith("#version"))
        .map((line) => line.trim()),
    },
    normalizer: null,
    pre_tokenizer: { type: "ByteLevel", add_prefix_space: false, use_regex: true },
    post_processor: null,
    decoder: { type: "ByteLevel" },
    added_tokens: [],
  },
  { tokenizer_class: "GPT2Tokenizer" },
);

const SAMPLES = [
  "Hello, world! The cat sat on the mat.",
  "નમસ્તે, તમે કેમ છો?",
  "I love pizza 🍕🍕 and 👩‍👩‍👧 hugs",
  "for (let i = 0; i < 10; i++) { total += i; }",
  "Don't stop    believing   ",
  "Unbelievably antidisestablishmentarianism 12345",
];

describe("GPT-2 pieces", () => {
  it("cuts text exactly as GPT-2's own tokenizer does", () => {
    for (const text of SAMPLES) {
      const ours = piecesOf(set, text).map(({ id }) => id);
      expect(ours).toEqual(reference.encode(text, { add_special_tokens: false }));
    }
  });

  it("knows every piece it makes", () => {
    for (const text of SAMPLES) {
      for (const piece of piecesOf(set, text)) expect(piece.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("puts the bytes back together into the same text", () => {
    for (const text of SAMPLES) {
      const bytes = piecesOf(set, text).flatMap((piece) => piece.bytes);
      expect(new TextDecoder().decode(new Uint8Array(bytes))).toBe(text);
    }
  });

  it("uses one piece per byte when it knows no merges", () => {
    const pieces = piecesOf(set, "cat 🍕", { known: 0 });
    expect(pieces).toHaveLength(8);
    expect(pieces.filter(({ text }) => text === null)).toHaveLength(4);
  });

  it("makes fewer pieces as it knows more merges, and as pieces may grow longer", () => {
    const text = "The children played happily in the garden.";
    const lengths = [0, 100, 1000, 50_000].map((known) => piecesOf(set, text, { known }).length);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
    expect(lengths[0]).toBeGreaterThan(lengths[3] ?? 0);
    expect(piecesOf(set, text, { longest: 2 }).every(({ bytes }) => bytes.length <= 2)).toBe(true);
    expect(piecesOf(set, text, { longest: 2 }).length).toBeGreaterThan(piecesOf(set, text).length);
  });

  it("spends more pieces than letters on Gujarati, and fewer on English", () => {
    const gujarati = "નમસ્તે, તમે કેમ છો?";
    expect(piecesOf(set, gujarati).length).toBeGreaterThan(letterCount(gujarati));
    const english = "Hello, how are you?";
    expect(piecesOf(set, english).length).toBeLessThan(letterCount(english));
  });
});

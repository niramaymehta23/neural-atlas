import {
  blendThreads,
  favourites,
  habitOf,
  hasUnreadWords,
  hogShare,
  isRealWord,
  mostLookedAt,
  MOST_LETTERS,
  MOST_WORDS,
  plain,
  readable,
  wordsOf,
  wordThreads,
  type Reading,
  type Threads,
} from "./attention";

/** One layer, two heads, words "the dogs ran" ("dogs" is two pieces): head 0 looks at the next token. */
function reading(): Reading {
  const size = 6; // [CLS] the dog ##s ran [SEP]
  const weights = new Float32Array(2 * size * size);
  for (let from = 0; from < size; from += 1) {
    weights[from * size + Math.min(size - 1, from + 1)] = 1; // head 0: the next token
    weights[size * size + from * size + 1] = 1; // head 1: everyone looks at "the"
  }
  return { words: ["The", "dogs", "ran."], pieces: [1, 2, 1], weights, layers: 1, heads: 2 };
}

const rowSums = (looks: number[][]) => looks.map((row) => row.reduce((a, b) => a + b, 0));

describe("the learner's own words", () => {
  it("keeps spelling, accents, punctuation and pictures as typed (ATT-04)", () => {
    expect(wordsOf("Héllo, can't 😀")).toEqual(["Héllo,", "can't", "😀"]);
    expect(wordsOf("  two\tspaces  ")).toEqual(["two", "spaces"]);
  });

  it("reads at most sixteen words and ninety letters", () => {
    const long = Array.from({ length: 20 }, (_, index) => `w${index}`).join(" ");
    expect(wordsOf(long)).toHaveLength(MOST_WORDS);
    expect(hasUnreadWords(long)).toBe(true);
    expect(hasUnreadWords("a b c")).toBe(false);
    expect(readable("x".repeat(2000))).toHaveLength(MOST_LETTERS);
  });

  it("compares words without their punctuation or capitals", () => {
    expect(plain("Tired.")).toBe("tired");
    expect(plain("can't")).toBe("cant");
    expect(isRealWord("😀")).toBe(false);
    expect(isRealWord("—")).toBe(false);
    expect(isRealWord("é")).toBe(true);
  });
});

describe("wordThreads", () => {
  it("keeps the learner's words and drops the sentence markers", () => {
    expect(wordThreads(reading(), 0, 0).words).toEqual(["The", "dogs", "ran."]);
  });

  it("follows one reader, without a word looking at itself", () => {
    const { looks } = wordThreads(reading(), 0, 0);
    // "The" → "dog" piece; "dogs": "dog"→"##s" is itself, "##s"→"ran."; "ran." → [SEP] is dropped.
    expect(looks).toEqual([
      [0, 1, 0],
      [0, 0, 1],
      [0, 0, 0],
    ]);
  });

  it("blends all readers and shares each word's looks out to 1", () => {
    const { looks } = wordThreads(reading(), 0, null);
    for (const sum of rowSums(looks.slice(0, 2))) expect(sum).toBeCloseTo(1);
    expect(looks[1]![0]).toBeCloseTo(2 / 3); // both pieces of "dogs" look at "The" in head 1
  });

  it("clamps depth and reader to what the model has", () => {
    expect(wordThreads(reading(), 9, 7)).toEqual(wordThreads(reading(), 0, 1));
    expect(blendThreads(reading(), [0, 0, 5], [0, 1])).toEqual(wordThreads(reading(), 0, null));
  });

  it("gives a word the model skips no threads at all", () => {
    const skipped: Reading = {
      ...reading(),
      words: ["The", "dogs", "ran.", "​"],
      pieces: [1, 2, 1, 0],
    };
    const { words, looks } = wordThreads(skipped, 0, 1);
    expect(words).toHaveLength(4);
    expect(looks[3]).toEqual([0, 0, 0, 0]);
    expect(looks.map((row) => row[3])).toEqual([0, 0, 0, 0]);
  });
});

describe("hogShare, mostLookedAt and favourites", () => {
  it("finds the word everyone looks at", () => {
    const threads = wordThreads(reading(), 0, 1);
    expect(hogShare(threads)).toEqual({ word: 0, share: 1 });
    expect(mostLookedAt(threads, 2, [0, 1])).toBe(0);
    expect(mostLookedAt(threads, 2, [])).toBeNull();
  });

  it("lists who a word looks at, strongest first, faint ones left out", () => {
    const threads: Threads = {
      words: ["a", "b", "c", "d"],
      looks: [[0, 0.2, 0.7, 0.1], [], [], []],
    };
    expect(favourites(threads, 0)).toEqual([2, 1, 3]);
    expect(favourites(threads, 0, 0.15)).toEqual([2, 1]);
  });
});

describe("habitOf", () => {
  const shaped = (pick: (from: number, count: number) => number, count = 5): Threads => ({
    words: Array.from({ length: count }, (_, index) => `w${index}`),
    looks: Array.from({ length: count }, (_, from) =>
      Array.from({ length: count }, (_, to) => (to === pick(from, count) ? 1 : 0)),
    ),
  });

  it("names a reader by what it mostly does", () => {
    expect(habitOf(shaped((from) => from + 1))).toEqual({ kind: "next" });
    expect(habitOf(shaped((from) => from - 1))).toEqual({ kind: "before" });
    expect(habitOf(shaped((from) => (from === 2 ? 0 : 2)))).toEqual({ kind: "one", word: 2 });
    const even: Threads = {
      words: ["a", "b", "c", "d", "e"],
      looks: Array.from({ length: 5 }, (_, from) =>
        Array.from({ length: 5 }, (_, to) => (to === from ? 0 : 0.25)),
      ),
    };
    expect(habitOf(even)).toEqual({ kind: "around" });
    expect(habitOf(shaped((from) => from + 1, 2))).toEqual({ kind: "around" });
  });
});

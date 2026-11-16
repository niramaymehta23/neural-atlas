import { hogShare, mostLookedAt, wordThreads, type Reading } from "./attention";

/** One layer, two heads, tokens [CLS] the dog ##s ran [SEP]: head 0 looks at the next token. */
function reading(): Reading {
  const tokens = ["[CLS]", "the", "dog", "##s", "ran", "[SEP]"];
  const size = tokens.length;
  const weights = new Float32Array(2 * size * size);
  for (let from = 0; from < size; from += 1) {
    weights[from * size + Math.min(size - 1, from + 1)] = 1; // head 0: the next token
    weights[size * size + from * size + 1] = 1; // head 1: everyone looks at "the"
  }
  return { tokens, weights, layers: 1, heads: 2 };
}

const rowSums = (looks: number[][]) => looks.map((row) => row.reduce((a, b) => a + b, 0));

describe("wordThreads", () => {
  it("joins word pieces and drops the sentence markers", () => {
    expect(wordThreads(reading(), 0, 0).words).toEqual(["the", "dogs", "ran"]);
  });

  it("follows one reader, without a word looking at itself", () => {
    const { looks } = wordThreads(reading(), 0, 0);
    // "the" → "dog" piece; "dogs": "dog"→"##s" is itself, "##s"→"ran"; "ran" → [SEP] is dropped.
    expect(looks).toEqual([
      [0, 1, 0],
      [0, 0, 1],
      [0, 0, 0],
    ]);
  });

  it("blends all readers and shares each word's looks out to 1", () => {
    const { looks } = wordThreads(reading(), 0, null);
    for (const sum of rowSums(looks.slice(0, 2))) expect(sum).toBeCloseTo(1);
    expect(looks[1]![0]).toBeCloseTo(2 / 3); // both pieces of "dogs" look at "the" in head 1
  });

  it("clamps depth and reader to what the model has", () => {
    expect(wordThreads(reading(), 9, 7)).toEqual(wordThreads(reading(), 0, 1));
  });
});

describe("hogShare and mostLookedAt", () => {
  it("finds the word everyone looks at", () => {
    const threads = wordThreads(reading(), 0, 1);
    expect(hogShare(threads)).toEqual({ word: 0, share: 1 });
    expect(mostLookedAt(threads, 2, [0, 1])).toBe(0);
    expect(mostLookedAt(threads, 2, [])).toBeNull();
  });
});

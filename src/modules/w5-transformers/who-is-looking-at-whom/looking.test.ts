import type { Reading } from "@/engine/pretrained/attention";
import { missions, HOG } from "./missions";
import { focusAfterMove, frameFor, moveWord, type LookingState } from "./model";
import { predictions } from "./predictions";
import { arc } from "./threads";

const STATE: LookingState = { sentence: "", depth: 1, reader: 0, focus: -1 };

/** One layer, one reader; every word looks only at `target`. */
function reading(words: string[], target: string): Reading {
  const tokens = ["[CLS]", ...words, "[SEP]"];
  const size = tokens.length;
  const weights = new Float32Array(size * size);
  const at = tokens.indexOf(target);
  for (let from = 0; from < size; from += 1)
    weights[from * size + (from === at ? (at + 1) % size : at)] = 1;
  return { tokens, weights, layers: 1, heads: 1 };
}

describe("who is looking at whom", () => {
  it("records which of the guess's words “it” looks at", () => {
    const words = ["the", "dog", "crossed", "the", "road", "it", "was", "tired"];
    expect(frameFor(reading(words, "dog"), STATE, 1).itLooksAt).toBe("dog");
    expect(frameFor(reading(["it", "ran"], "ran"), STATE, 1).itLooksAt).toBeNull();
    const [prediction] = predictions;
    expect(prediction.answer(STATE, frameFor(reading(words, "road"), STATE, 2))).toBe("road");
  });

  it("fires the hog mission when one word gets most of the looking", () => {
    const [mission] = missions;
    const hogged = frameFor(reading(["banana", "the", "the", "the"], "banana"), STATE, 1);
    expect(hogged.hog).toBeGreaterThanOrEqual(HOG);
    expect(mission.when(STATE, hogged)).toBe(true);
    expect(mission.when(STATE, { ...hogged, hog: HOG - 0.1 })).toBe(false);
  });

  it("moves a word and keeps the picked-out word picked out", () => {
    expect(moveWord(["a", "b", "c", "d"], 0, 2)).toBe("b c a d");
    expect(focusAfterMove(0, 0, 2)).toBe(2);
    expect(focusAfterMove(1, 0, 2)).toBe(0);
    expect(focusAfterMove(3, 0, 2)).toBe(3);
    expect(focusAfterMove(1, 3, 0)).toBe(2);
  });

  it("arcs higher for longer jumps", () => {
    const lift = (path: string) => 230 - Number(path.split(" ")[5]);
    expect(lift(arc(0, 5, 6))).toBeGreaterThan(lift(arc(0, 1, 6)));
  });
});

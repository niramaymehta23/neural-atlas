import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Reading } from "@/engine/pretrained/attention";
import { ATTENTION_MODEL } from "@/engine/pretrained/runtime";
import { loadReading, type StoredReading } from "@/engine/pretrained/testing/fixture";
import stored from "@/engine/pretrained/testing/example-reading.json";
import { definition } from "./index";
import { missions } from "./missions";
import {
  CHARACTERFUL,
  compareState,
  DEPTHS,
  focusAfterMove,
  frameFor,
  HOG,
  moveWord,
  READERS,
  type LookingFrame,
  type LookingState,
} from "./model";
import { predictions } from "./predictions";
import { describeLooking } from "./describe";

const initial = definition.initialState as LookingState;
const STATE: LookingState = { ...initial, sentence: "", depth: 1, reader: 0, focus: -1 };
const example = loadReading(stored as StoredReading);

/** One layer, one reader; every word looks only at `target` (which looks at the next word). */
function reading(words: string[], target: number): Reading {
  const size = words.length + 2;
  const weights = new Float32Array(size * size);
  for (let from = 0; from < size; from += 1)
    weights[from * size + (from === target + 1 ? (target + 2) % size : target + 1)] = 1;
  return { words, pieces: words.map(() => 1), weights, layers: 1, heads: 1 };
}

describe("the guess (ATT-02)", () => {
  it("has one answer whatever the dials say, on the real model's reading", () => {
    const answers = new Set<string | null>();
    for (let depth = 1; depth <= DEPTHS; depth += 1)
      for (let reader = 0; reader <= READERS; reader += 1)
        answers.add(frameFor(example, { ...initial, depth, reader }, 1).itLooksAt);
    expect([...answers]).toEqual(["tired"]);
    const [prediction] = predictions;
    expect(prediction.answer(initial, frameFor(example, initial, 1))).toBe("tired");
  });

  it("waits when the sentence lacks the words it asks about", () => {
    const frame = frameFor(reading(["it", "ran", "away"], 1), STATE, 1);
    expect(frame.itLooksAt).toBeNull();
  });
});

describe("the hog mission (ATT-01)", () => {
  const [mission] = missions;
  const frame = (words: string[], target = 0): LookingFrame =>
    frameFor(reading(words, target), STATE, 1);

  it("never fires on a two- or three-word sentence, however lopsided", () => {
    expect(frame(["hi", "there"]).hog).toBe(1);
    expect(mission.when(STATE, frame(["hi", "there"]))).toBe(false);
    expect(mission.when(STATE, frame(["the", "cat", "sat"], 1))).toBe(false);
  });

  it("needs six real words, and the share must stand out for the sentence's length", () => {
    const six = frame(["banana", "the", "a", "of", "to", "in"]);
    expect(mission.when(STATE, six)).toBe(true);
    expect(mission.when(STATE, { ...six, realWords: 5 })).toBe(false);
    // Six words: an even share would be one in five, so the hog needs four fifths.
    expect(mission.when(STATE, { ...six, hog: 0.79 })).toBe(false);
    const sixteen = frame(
      Array.from({ length: 16 }, (_, index) => (index === 3 ? "banana" : "a")),
      3,
    );
    expect(mission.when(STATE, { ...sixteen, hog: HOG })).toBe(true);
    expect(mission.when(STATE, { ...sixteen, hog: HOG - 0.01 })).toBe(false);
  });

  it("does not count punctuation or pictures as the hog", () => {
    const words = ["…", "the", "a", "of", "to", "in", "on"];
    expect(frame(words).hog).toBe(0);
  });
});

describe("moving words (ATT-04)", () => {
  it("moves the learner's own words, spelling and punctuation intact", () => {
    expect(moveWord("Héllo, can't 😀 ok", 0, 2)).toBe("can't 😀 Héllo, ok");
    expect(moveWord("a b c d", 0, 2)).toBe("b c a d");
  });

  it("leaves words past the ones read where they were", () => {
    const words = Array.from({ length: 18 }, (_, index) => `w${index}`);
    const moved = moveWord(words.join(" "), 0, 15).split(" ");
    expect(moved.slice(15)).toEqual(["w0", "w16", "w17"]);
    expect(moveWord(words.join(" "), 0, 17)).toBe(words.join(" "));
  });

  it("keeps the picked-out word picked out", () => {
    expect(focusAfterMove(0, 0, 2)).toBe(2);
    expect(focusAfterMove(1, 0, 2)).toBe(0);
    expect(focusAfterMove(3, 0, 2)).toBe(3);
    expect(focusAfterMove(1, 3, 0)).toBe(2);
  });
});

describe("compare (ATT-09)", () => {
  it("shows something different from the main view", () => {
    expect(definition.compare?.(initial)).not.toEqual(initial);
    expect(compareState(initial).reader).toBe(CHARACTERFUL[initial.depth - 1]);
    expect(compareState({ ...initial, reader: 5 }).reader).toBe(0);
    for (let depth = 1; depth <= DEPTHS; depth += 1)
      expect(compareState({ ...initial, depth }).reader).toBeGreaterThan(0);
  });
});

describe("links (ATT-06, PLT-02)", () => {
  it("clips a 2000-letter sentence and clamps every dial", () => {
    const state = definition.parseState!(
      {
        ...initial,
        sentence: "word ".repeat(400),
        depth: 99,
        reader: -4,
        focus: 400,
      },
      initial,
    ) as LookingState;
    expect(state.sentence.length).toBeLessThanOrEqual(90);
    expect(state).toMatchObject({ depth: DEPTHS, reader: 0, focus: 15 });
  });
});

describe("what screen readers hear (A11Y-13, ATT-14)", () => {
  it("names who the picked word looks at, or where most looking lands", () => {
    const frame = frameFor(example, initial, 1);
    expect(describeLooking(initial, frame)).toMatch(/^“it” looks most at “.+”, then at “.+”\.$/);
    const everyone = { ...initial, focus: -1 };
    expect(describeLooking(everyone, frameFor(example, everyone, 1))).toMatch(
      /^Most of the looking lands on “.+”\.$/,
    );
    expect(describeLooking(initial, undefined)).toBe("");
  });
});

describe("the model's credit and version (ATT-17, ATT-05)", () => {
  const folder = join(process.cwd(), "public/models", ATTENTION_MODEL);

  it("ships its licence and notice, and the drawer names it", () => {
    expect(existsSync(join(folder, "LICENSE"))).toBe(true);
    expect(existsSync(join(folder, "NOTICE"))).toBe(true);
    expect(readFileSync(join(folder, "LICENSE"), "utf8")).toMatch(/Apache License/);
    expect(existsSync(join(process.cwd(), "public/models/onnxruntime-web.LICENSE.txt"))).toBe(true);
  });

  it("lives in a versioned folder the export script writes to", () => {
    expect(ATTENTION_MODEL).toMatch(/-v\d+$/);
    const script = readFileSync(join(process.cwd(), "scripts/export-attention-model.py"), "utf8");
    expect(script).toContain(`public/models/${ATTENTION_MODEL}`);
  });
});

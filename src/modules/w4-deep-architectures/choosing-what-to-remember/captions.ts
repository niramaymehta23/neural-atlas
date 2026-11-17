// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { GateMode } from "@/engine/sequence/recurrent";
import type { Memory, Sureness } from "@/features/memory/run";

export const captions = {
  opening:
    "This reader's memory has three little gates. One decides what to keep, one decides which new words to let in, and one decides when to read the memory out. Let it practise on a long sentence, then open and shut the gates yourself.",
  story:
    "The gates let the reader hold the first word safe and shut out the words that do not matter. Because the keep gate can stay open, the lesson from the end reaches all the way back to the start, so it learns to remember even a long sentence.",
  compare: {
    label: "Compare the memory with gates and a plain one",
    leftLabel: "With gates",
    rightLabel: "Plain memory",
  },
};

const MODES: Record<GateMode, string> = {
  auto: "Let it decide",
  open: "Always open",
  shut: "Always shut",
};

export const words = {
  length: {
    label: "How long the sentence is",
    words: (count: string) => `${count} words`,
  },
  step: {
    label: "How big a step",
    tiny: "tiny steps",
    small: "small steps",
    big: "big steps",
    huge: "huge steps",
  },
  start: {
    label: "First word",
    sunny: "Sunny",
    rainy: "Rainy",
  },
  gates: {
    modes: MODES,
    keep: { label: "Keep gate", note: "Open keeps what it remembers; shut wipes it." },
    letIn: { label: "Let-in gate", note: "Open lets the new word in; shut keeps it out." },
    readOut: { label: "Read-out gate", note: "Open reads the memory out; shut hides it." },
    plain: "A plain memory has no gates.",
  },
  strip: {
    picture: "The sentence word by word, with a memory bead over each word and its gates under it",
    first: ["Sunny", "Rainy"] as const,
    fillers: [
      "and",
      "then",
      "we",
      "went",
      "to",
      "the",
      "park",
      "saw",
      "a",
      "big",
      "dog",
      "so",
      "all",
      "ran",
      "back",
      "home",
    ],
    gatesKey:
      "Under each word: the keep, let-in and read-out gates, in that order. The fuller the jar, the more open the gate.",
  },
  bead: "Memory bead: the fuller it is, the more the reader still remembers the first word.",
  practise: "Let it practise",
  again: "Practise again",
  working: "Practising…",
  waiting: "Tap “Let it practise” to watch it learn.",
  things: { sunny: "sunglasses", rainy: "an umbrella" },
  sureness: {
    sure: "and it is sure",
    fairly: "and it is fairly sure",
    guessing: "but it is only guessing",
  } satisfies Record<Sureness, string>,
  says: (thing: string, sure: string) => `At the end it says: take ${thing}, ${sure}.`,
  memory: {
    remembers: "On new sentences it nearly always picks the right thing.",
    some: "On new sentences it is right only some of the time.",
    guessing: "On new sentences it does no better than tossing a coin.",
  } satisfies Record<Memory, string>,
  describe: {
    waiting: (length: string) => `A sentence of ${length}, waiting for the reader to practise.`,
    working: "The reader is practising.",
    done: (length: string, memory: string) => `After practice on sentences of ${length}: ${memory}`,
  },
  drawer: {
    mechanics: "How the gates work",
    store:
      "Besides its memory, this reader keeps a store. At each word, the keep gate decides how much of the store to keep, the let-in gate decides how much of the new word to add, and the read-out gate decides how much of the store becomes its memory for the next word.",
    learning:
      "The gates are not set by hand: the reader learns when to open and shut them while it practises. Setting a gate to “Always open” or “Always shut” here overrides what it learned, without practising again.",
    reach:
      "When the keep gate stays open, the store passes from word to word almost unchanged, so the blame from the answer can travel all the way back to the first word. That is why gated readers learn long sentences that a plain reader cannot.",
    maths: "The maths",
    formula:
      "keep, letIn, readOut = sigmoid(…); new = tanh(…); store(t) = keep × store(t−1) + letIn × new; memory(t) = readOut × tanh(store(t)). This is a long short-term memory (LSTM) cell.",
  },
};

export const missionWords = {
  goal: "Lock every gate shut",
  hint: "Let it practise, then set all three gates to “Always shut”.",
  success:
    "With every gate shut, no word can get into the store, nothing is kept and nothing is read out. The memory stays empty all the way, so the reader can only guess.",
};

export const predictionWords = {
  question: "Can the reader with gates remember the first word across a long sentence?",
  yes: "Yes, it will remember",
  no: "No, it will forget",
};

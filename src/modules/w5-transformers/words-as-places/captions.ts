// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count } from "@/design/copy";

export const captions = {
  opening:
    "Imagine every word has its own spot on a giant map, and words that mean similar things live near each other. Pick a start word, then walk the way you would go from one word to another. Where do you land?",
  story:
    "The arrow from “man” to “woman” points roughly the same way as the arrow from “king” to “queen”, so walking it from “king” lands near “queen”. Nobody drew the map by hand: it was learned from which words turn up next to which.",
  compare: {
    label: "Compare skipping the start words with keeping them",
    leftLabel: "Your setting",
    rightLabel: "Start words flipped",
  },
};

/** Ready-made walks to try: start, walk away from, walk toward. */
export const WALKS = {
  royal: ["king", "man", "woman"],
  cities: ["paris", "france", "italy"],
  moving: ["walking", "walk", "swim"],
  sizes: ["bigger", "big", "small"],
} as const;

export const words = {
  from: "Start at",
  minus: "Walk away from",
  plus: "Walk toward",
  walks: {
    label: "Or try",
    royal: "King, man, woman",
    cities: "Paris, France, Italy",
    moving: "Walking, walk, swim",
    sizes: "Bigger, big, small",
  },
  amount: {
    label: "How far to follow the arrow",
    describe: (amount: number) => {
      if (amount < 0.05) return "Stay at the start";
      if (Math.abs(amount - 1) < 0.05) return "The whole arrow";
      if (amount > 1) return "Past the end of the arrow";
      if (Math.abs(amount - 0.5) < 0.05) return "Half the arrow";
      return amount < 0.5 ? "Less than half the arrow" : "More than half the arrow";
    },
  },
  skip: "Skip the words you started with",
  shown: {
    label: "How many nearby words to show",
    describe: (value: number) => `The nearest ${count(value)}`,
  },
  landing: "Nearest words to where you land",
  closeness: (likeness: number) => {
    if (likeness >= 0.95) return "right on top";
    if (likeness >= 0.85) return "very close";
    if (likeness >= 0.7) return "close";
    return "not very close";
  },
  start: "a start word",
  unknown: (list: string) => `The map has no spot for ${list}. Try a more everyday word.`,
  empty: "Type a word in each box.",
  picture:
    "A flat slice of the word map. The dashed arrow goes from the second word to the third. The solid arrow walks the same way from the start word, and a star marks where it lands.",
  landed: "you land here",
  model: {
    loading: "Fetching the word map…",
    failed: "The word map could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  describe: {
    waiting: "The word map is getting ready.",
    unknown: "One of the words is not on the map.",
    done: (from: string, minus: string, plus: string, top: string) =>
      `Starting at ${from} and walking from ${minus} toward ${plus} lands nearest ${top}.`,
  },
  drawer: [
    {
      title: "How the map was made",
      paragraphs: [
        "Each word's spot is a list of 50 numbers, like a spot in a 50-direction space. The picture can only show two of those directions, so words that look close on the flat slice can be further apart in the full map.",
        "The numbers were learned by reading billions of words of news and Wikipedia: words that keep the same company end up with similar numbers. These are GloVe word places from Stanford, shared freely (public domain).",
        "The walk adds the arrow from the second word to the third onto the start word. Then it looks for the words pointing most the same way as where you landed.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "Each word is a vector. The walk is king − man + woman, scaled by the dial: king + t × (woman − man). Nearness is cosine similarity: the cosine of the angle between two vectors.",
        "The famous trick quietly leaves out the start words. Without that rule, the nearest word to king − man + woman is still king.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Break the analogy trick: follow the whole arrow and land back on a start word",
  hint: "Turn off “Skip the words you started with”, then follow the whole arrow.",
  success:
    "The trick only works because the start words are quietly skipped. Without that rule the walk often lands back where it began: the arrow is a hint, not an exact rule.",
};

export const predictionWords = {
  question:
    "Start at “king”, walk away from “man” and toward “woman”, the whole arrow. Which word will be nearest?",
  queen: "Queen",
  prince: "Prince",
  other: "Something else",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.

const quote = (word: string) => `“${word}”`;

export const captions = {
  opening:
    "“Dog bites man” is everyday news. “Man bites dog” is a headline! Same three words, different order. A reader that just adds up its words can't tell them apart, so each word gets a stamp saying where it sits.",
  story:
    "With no stamps, the reader only knows which words are there, not their order. Stamps made of waves give every place its own pattern, so moving a word changes what the reader sees.",
  compare: {
    label: "Compare your stamps with no stamps at all",
    leftLabel: "Your stamps",
    rightLabel: "No stamps",
  },
};

export const words = {
  example: "dog bites man",
  sentence: "Type a short sentence",
  typed: "As you typed it",
  read: "In a new order",
  stamp: (at: number) => `The stamp for place ${at}`,
  earlier: (word: string) => `Move ${quote(word)} one place earlier`,
  later: (word: string) => `Move ${quote(word)} one place later`,
  reverse: "Turn the order around",
  restore: "Put the words back in order",
  fewWords: "Type at least two words.",
  most: "Only the first eight words are used.",
  strength: {
    label: "How strong the order stamps are",
    describe: (value: number) =>
      value < 0.01
        ? "No stamps at all"
        : value < 0.4
          ? "Faint stamps"
          : value < 0.8
            ? "Clear stamps"
            : "Bold stamps",
  },
  speed: {
    label: "How fast the stamp waves change",
    describe: (value: number) =>
      value < 0.01 ? "Flat: every place looks the same" : value < 0.4 ? "Slow waves" : "Fast waves",
  },
  same: "These are the same words in the same order.",
  difference: (difference: number) => {
    if (difference <= 1e-6) return "The reader can’t tell the two orders apart at all.";
    if (difference < 0.02) return "The reader barely notices the new order.";
    if (difference < 0.08) return "The reader notices the new order a little.";
    return "The reader clearly notices the new order.";
  },
  meter: "How differently the reader sees the two orders",
  describe: {
    done: (read: string, line: string) => `The words are read as ${quote(read)}. ${line}`,
  },
  drawer: [
    {
      title: "How the stamps work",
      paragraphs: [
        "Every word has a code: a list of numbers. The reader looks at all the codes at once and adds up what it finds, so without help it treats a sentence like a bag of words.",
        "An order stamp is another list of numbers, one for each place in the sentence, added to the word sitting there. The stamps are waves: the first numbers swing quickly from place to place and the last ones slowly, a little like the hands of a clock.",
        "With flat waves every place gets the same stamp, which is as good as no stamp at all.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is sinusoidal positional encoding from the original transformer: for place p and pair i, sin(p ÷ 10000^(2i/d)) and cos(p ÷ 10000^(2i/d)). Here the rates halve from one pair to the next, and the speed dial scales them all.",
        "The toy reader sums tanh(W (code + stamp)) over the words. Summing ignores order, so only the stamps can make it notice. The word codes here are made up from each word's spelling, not learned.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Shuffle the words without the reader noticing",
  hint: "Put the words in a new order, then turn the stamps right down, or make their waves flat.",
  success:
    "Without order stamps, a reader that looks at every word at once only sees which words are there. “Dog bites man” and “man bites dog” look exactly the same to it.",
};

export const predictionWords = {
  question:
    "Turn the order stamps all the way down. Will the reader still tell “dog bites man” from “man bites dog”?",
  yes: "Yes, it still notices",
  no: "No, they look the same to it",
};

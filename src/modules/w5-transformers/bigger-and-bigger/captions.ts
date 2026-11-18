// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.

/** A power of ten as words: 9.3 → "about 2 billion". */
export function bigNumber(power: number): string {
  const scales = [
    { at: 12, word: "trillion" },
    { at: 9, word: "billion" },
    { at: 6, word: "million" },
    { at: 3, word: "thousand" },
  ];
  const scale = scales.find(({ at }) => power >= at);
  if (!scale) return `about ${Math.round(10 ** power)}`;
  const value = 10 ** (power - scale.at);
  const shown =
    value >= 100
      ? Math.round(value / 10) * 10
      : value >= 10
        ? Math.round(value)
        : Math.round(value * 10) / 10;
  return `about ${shown.toLocaleString("en-GB")} ${scale.word}`;
}

export const captions = {
  opening:
    "Chatbots got better by growing three things: a bigger brain, more reading, and more computing power to do the learning. Grow the dials and see what helps, and what is wasted.",
  story:
    "With a fixed amount of computing, a bigger brain has less time to read, and more reading leaves less for the brain. The best writers grow both together. Pour everything into one, and the other holds it back.",
  compare: {
    label: "Compare your plan with the best plan for the same computing",
    leftLabel: "Your plan",
    rightLabel: "Best plan",
  },
};

export const words = {
  brain: {
    label: "How big the brain is",
    describe: (power: number) => `${bigNumber(power)} numbers to learn`,
  },
  reading: {
    label: "How much it reads",
    describe: (power: number) => `${bigNumber(power)} word pieces`,
  },
  budget: {
    label: "How much computing power",
    describe: (power: number) => `${bigNumber(power)} sums`,
  },
  quality: (loss: number) => {
    if (loss < 2) return "writes very well";
    if (loss < 2.4) return "writes well";
    if (loss < 3) return "writes so-so";
    if (loss < 4) return "writes poorly";
    return "can barely write at all";
  },
  yours: (quality: string) => `Your writer ${quality}.`,
  bestLine: (quality: string) => `With the best split of this computing, it ${quality}.`,
  ranOut: (read: string) => `The computing ran out first, so it only read ${read} word pieces.`,
  leftOver: "Some computing was left over: it could have read more or grown bigger.",
  lopsided: "Nearly everything went into one dial, so the other holds it back.",
  picture:
    "A curve of how well writers of every brain size would do if they spent all of this computing: lower is better. A dot marks your writer and a star marks the best brain size.",
  axis: { smaller: "smaller brain", bigger: "bigger brain", better: "better ↓" },
  you: "you",
  bestMark: "best",
  describe: (yours: string, best: string) => `${yours} ${best}`,
  drawer: [
    {
      title: "Where the curve comes from",
      paragraphs: [
        "In 2022, researchers at DeepMind trained over 400 language models of different sizes on different amounts of text, and fitted a formula to how good each one got. This lesson uses their formula; nothing is trained here.",
        "Training costs about six sums for every number in the brain, for every word piece read. So with a fixed amount of computing, brain size and reading trade off against each other.",
        "Their surprising finding was that many big models of the time were too big for how much they had read. A smaller brain that reads more can beat them for the same computing.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "The Chinchilla scaling law: L(N, D) = 1.69 + 406.4 ÷ N^0.34 + 410.7 ÷ D^0.28, where L is the average surprise per word piece, N the number of parameters and D the number of training tokens. Compute C ≈ 6ND.",
        "For a fixed C, the best N and D both grow roughly as the square root of C. The 1.69 is the part no model can remove: the randomness of language itself.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Spend everything on the wrong dial",
  hint: "Use up all the computing with a huge brain that has hardly any time to read, or a tiny brain that reads for ever.",
  success:
    "A giant brain that barely reads, or a tiny brain that reads everything, wastes the computing. Growing brain and reading together gets far more for the same effort.",
};

export const predictionWords = {
  question: "Give it ten times more computing power. To get the best writer, what should grow?",
  brain: "Only the brain",
  reading: "Only the reading",
  both: "Both, about evenly",
};

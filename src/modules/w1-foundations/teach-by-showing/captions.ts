// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A little robot wants to help sort fruit, but nobody can write down a rule for it. So you sort a few fruit yourself, and it watches.",
  story:
    "You never told the robot a rule. It only saw your examples: what your apples looked like and what your pears looked like. From those it worked out a pattern of its own.",
  compare: {
    label: "Compare your sorting with careful sorting",
    leftLabel: "Your sorting",
    rightLabel: "Every fruit in its own basket",
  },
};

export const words = {
  fruit: { 0: "apple", 1: "pear" } as Record<0 | 1, string>,
  baskets: {
    label: "Which basket?",
    0: "Apple basket",
    1: "Pear basket",
  },
  next: "Which basket does this fruit go in?",
  fruitPicture: {
    0: "A fruit to sort, shaped like an apple",
    1: "A fruit to sort, shaped like a pear",
  } as Record<0 | 1, string>,
  doneSorting: "All sorted! Now let the robot try new fruit.",
  sortedSoFar: "What you showed it",
  emptyBasket: "Nothing yet",
  startOver: "Sort them again",
  robot: "The robot",
  letItTry: "Let the robot sort new fruit",
  tryAgain: "Let it try again",
  needSorting: "Sort every fruit first.",
  robotWaiting: "The robot is watching. Once you have sorted every fruit, let it try.",
  robotScore: (right: string, total: string) =>
    `The robot sorted ${right} of ${total} new fruit right.`,
  robotPile: { 0: "The robot’s apple basket", 1: "The robot’s pear basket" } as Record<
    0 | 1,
    string
  >,
  right: "right",
  wrong: "wrong",
  newFruitNote: (fruit: string, verdict: string) => `A new ${fruit}, sorted ${verdict}`,
  shownNote: {
    0: { right: "An apple", wrong: "An apple, in the wrong basket" },
    1: { right: "A pear", wrong: "A pear, in the wrong basket" },
  } as Record<0 | 1, { right: string; wrong: string }>,
  show: {
    label: "How many fruit you show it",
    few: "just a few",
    some: "some",
    lots: "lots",
  },
  messy: {
    label: "How messy the fruit is",
    neat: "neat and tidy",
    some: "a bit mixed",
    very: "very mixed up",
  },
  describe: {
    sorting: (left: string) => `${left} fruit still to sort.`,
    waiting: "Every fruit is sorted. The robot has not tried yet.",
    tried: (right: string, total: string, wrong: string | null) =>
      wrong
        ? `The robot sorted ${right} of ${total} new fruit right, after you put ${wrong} fruit in the wrong basket.`
        : `The robot sorted ${right} of ${total} new fruit right, after you sorted every fruit right.`,
  },
  drawer: {
    mechanics: "How the robot sorts",
    facts:
      "The robot can’t see the fruit like you do. It only knows two facts about each one: how round it is and how red it is.",
    average:
      "For each basket it works out the average fruit: how round and how red your apples were, and your pears. A new fruit goes in the basket whose average it is closest to.",
    maths: "The maths",
    distance:
      "Closeness is the straight-line distance between two fruit when you plot roundness across and redness up: √((round₁ − round₂)² + (red₁ − red₂)²).",
  },
};

export const missionWords = {
  goal: "Teach it wrong: put fruit in the wrong basket",
  hint: "Put some apples in the pear basket, then let the robot sort new fruit.",
  success:
    "The robot copied your mistakes. It has no idea what an apple really is: it only learns from the examples it is shown, wrong ones too.",
};

export const predictionWords = {
  question: "After watching you, will the robot sort most of the new fruit right?",
  yes: "Yes, most of them",
  no: "No, it will get lots wrong",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A machine checks apples as they roll past and throws out the ones it thinks have a worm inside. Its makers say it gets 99 out of 100 apples right. Sounds great, doesn’t it?",
  story:
    "When wormy apples are rare, a machine that calls every apple fine is right almost every time, and catches no worms at all. One score is not enough: you also need to ask how many it caught and how many alarms were real.",
  compare: {
    label: "Compare with a sorter set halfway",
    leftLabel: "Your sorter",
    rightLabel: "Halfway",
  },
};

export const words = {
  rare: {
    label: "How many wormy apples in every hundred",
    describe: (count: string, one: boolean) =>
      one ? "one wormy apple in every hundred" : `${count} wormy apples in every hundred`,
  },
  threshold: {
    label: "How suspicious the sorter is",
    jumpy: "throws out anything a bit odd",
    middle: "throws out the fairly odd ones",
    relaxed: "only throws out the very odd ones",
    never: "never throws anything out",
  },
  boxes: {
    caught: "Thrown out, and wormy: caught",
    falseAlarm: "Thrown out, but fine: a false alarm",
    missed: "Kept, but wormy: missed",
    clear: "Kept, and fine",
  },
  box: (name: string, count: string) => `${name}: ${count}`,
  key: {
    wormy: "Wormy apple",
    fine: "Fine apple",
  },
  board: "Where every apple ended up",
  right: (share: string) => `Right overall: ${share}`,
  caught: (caught: string, wormy: string) => `Wormy apples caught: ${caught} of ${wormy}`,
  noWorms: "There are no wormy apples to catch.",
  trusted: (share: string) => `Thrown-out apples that really were wormy: ${share}`,
  noneThrown: "It hasn’t thrown any apples out.",
  describe: (right: string, caught: string) => `${right}. ${caught}.`,
  drawer: {
    mechanics: "Three ways to score a sorter",
    right:
      "Right overall counts every apple it got right. When almost every apple is fine, saying “fine” every time already looks brilliant.",
    caught:
      "Caught counts how many of the wormy apples it threw out. This is what you care about when missing one is bad.",
    trust:
      "Real alarms counts how many of the apples it threw out were really wormy. This is what you care about when false alarms are costly.",
    trade:
      "Making the sorter more suspicious catches more worms but raises more false alarms. The curve shows every setting at once: the closer it hugs the top left corner, the better the sorter.",
    curve: "Every setting of the sorter: false alarms along, worms caught up. The ring is yours.",
    maths: "The maths",
    formula:
      "Accuracy = (TP + TN) ÷ all. Recall = TP ÷ (TP + FN). Precision = TP ÷ (TP + FP). The ROC curve plots recall against the false-positive rate FP ÷ (FP + TN) for every threshold; the area under it (AUC) is 1 for a perfect sorter and ½ for a coin toss.",
  },
};

export const missionWords = {
  lazy: {
    goal: "Build a sorter that scores 99 out of 100 but catches no worms",
    hint: "Make wormy apples as rare as they go, then make the sorter so relaxed it never throws anything out.",
    success:
      "Ninety-nine out of a hundred right, and not one worm caught. With rare worms, “right overall” mostly measures how rare they are. Always ask how many it caught too.",
  },
};

export const predictionWords = {
  question:
    "One apple in a hundred is wormy, and a lazy sorter calls every apple fine. How many out of 100 will it get right?",
  fifty: "About 50",
  ninety: "About 90",
  ninetyNine: "99",
};

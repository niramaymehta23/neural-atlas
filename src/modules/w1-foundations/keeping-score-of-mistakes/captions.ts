// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A line is learning to pass through the dots. A scorer marks every miss, and the line moves to make its score as small as it can. You choose how strict the scorer is.",
  story:
    "The square on each dot shows how much its miss costs. A gentle scorer counts a miss as it is. A strict one makes big misses cost hugely, so far-off dots drag the line towards them.",
  compare: {
    label: "Compare your scorer with the gentlest one",
    leftLabel: "Your scorer",
    rightLabel: "The gentlest scorer",
  },
};

export const words = {
  field: "The dots, the line and the cost squares",
  fieldLabel: (rare: string, miss: string) =>
    `Circles: the main group. Diamonds: ${rare}. The line passes the main group ${miss}.`,
  key: "Circles: the main group. Diamonds: the rare group, far off. Squares: what each miss costs (bigger square, bigger cost).",
  rareWords: {
    none: "none here",
    some: (count: string, one: boolean) => (one ? "one far-off dot" : `${count} far-off dots`),
  },
  missWords: {
    close: "very close",
    near: "fairly close",
    far: "a long way off",
  },
  showing: {
    waiting: "The line is flat, waiting to learn.",
    walking: "The line is moving to make the score smaller.",
    done: "The line has settled where the score is smallest.",
  },
  start: "Let the line learn",
  again: "Learn again",
  strict: {
    label: "How strict the scorer is",
    gentle: "gentle: a miss costs what it is",
    middle: "fairly strict",
    strict: "very strict: big misses cost hugely",
  },
  rare: {
    label: "How many in the rare group",
    none: "none",
    few: "a few",
    lots: "quite a lot",
  },
  describe: {
    waiting: (strict: string) => `The line is waiting to learn. The scorer is ${strict}.`,
    walking: "The line is moving to make the score smaller.",
    done: (strict: string, miss: string, rare: string) =>
      `With a scorer that is ${strict}, the line settled ${miss} from the main group, and the rare group is ${rare}.`,
    rareNear: "pulling it towards them",
    rareIgnored: "left far away",
    rareNone: "empty",
  },
  drawer: {
    mechanics: "How the score works",
    cost: "For each dot, the scorer takes the miss (how far the dot is above or below the line) and turns it into a cost. All the costs are averaged into one score.",
    strict:
      "A gentle scorer uses the miss as it is. A strict one multiplies the miss by itself a few times, so a miss twice as big can cost up to sixteen times as much.",
    walk: "The line then moves its tilt and height a little at a time, in whichever direction makes the score smaller, until it settles.",
    maths: "The maths",
    formula:
      "score = (1/n) Σ |tilt × x + height − y|ᵖ, with p going from 1 (gentle) to 4 (strict). p = 1 is the average absolute miss; p = 2 is the average squared miss. Each dot pulls the line with the slope of its cost, p × |miss|ᵖ⁻¹.",
  },
};

export const missionWords = {
  goal: "Find a scorer that lets the line ignore the rare group",
  hint: "Keep some far-off dots, turn the scorer right down to gentle, and let the line learn.",
  success:
    "A gentle scorer counts a big miss as just a big miss, not a huge one. So a few far-off dots can’t outvote the main group, and the line stays with the crowd.",
};

export const predictionWords = {
  question: "With a very strict scorer, which dots will pull the line the hardest?",
  far: "The far-off dots",
  near: "The dots close to the line",
};

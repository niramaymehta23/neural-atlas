// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A big team of brain cells practises on a few messy dots. Then it is tested on new dots it has never seen. Can it learn the picture, not just the dots?",
  story:
    "A big team can learn every practice dot by heart and still get new dots wrong. Switching some cells off at random while it practises means no cell can lean on the others, so the team learns the broad picture. Switch off too many and it learns nothing.",
  compare: {
    label: "Compare with no cells switched off",
    leftLabel: "Your switching off",
    rightLabel: "No switching off",
  },
};

export const words = {
  field:
    "The practice dots, the new dots and the team’s guess: each kind of dot has its own shape, and the shading shows which kind the team expects there",
  key: {
    practice: "Filled shapes: practice dots",
    fresh: "Hollow shapes: new dots",
  },
  team: {
    title: "The team",
    label: (off: string, team: string) =>
      `The team of ${team} cells, with ${off} switched off at this moment of practice`,
    moment: (off: string) =>
      `One moment of practice: the crossed-out cells (${off}) were switched off. A fresh set is switched off for every dot.`,
    before: "Every cell is on before practice starts.",
  },
  scores: {
    waiting: "Press “Practise” to let the team learn.",
    practice: (score: string) => `Practice dots: ${score}.`,
    fresh: (score: string) => `New dots: ${score}.`,
  },
  chart: "How many practice dots and new dots the team sorts right as it practises",
  chartKey: {
    practice: "Solid line: practice dots",
    fresh: "Dashed line: new dots",
  },
  off: {
    label: "How many cells switch off while it learns",
    none: "none",
    few: "a few",
    half: "about half",
    most: "most",
    nearlyAll: "nearly all",
  },
  teamDial: {
    label: "How big the team is",
    count: (number: string) => `${number} cells`,
  },
  practise: "Practise",
  again: "Practise again",
  practising: "Practising…",
  describe: {
    waiting: "The team has not practised yet.",
    practising: "The team is practising.",
    done: (practice: string, fresh: string) => `Practice dots: ${practice}. New dots: ${fresh}.`,
  },
  drawer: {
    mechanics: "How switching off works",
    off: "For every practice dot, each cell is switched off with the chance on the dial, and the cells left on speak a little louder to make up for it.",
    why: "A cell that might vanish at any moment cannot be the only one that remembers a dot, so the team spreads what it knows across many cells.",
    test: "When the team is tested, on practice dots or new ones, every cell is on.",
    maths: "The maths",
    formula:
      "With a switch-off chance p, each cell’s output is multiplied by 0 (chance p) or by 1 ÷ (1 − p) while practising. The dial’s top is p = 0.95.",
  },
};

export const missionWords = {
  goal: "Switch off so many cells that the team learns nothing",
  hint: "Turn “How many cells switch off” right up, then practise.",
  success:
    "With nearly every cell switched off, the team hardly learned at all: its practice mistakes stayed close to guessing and it got about as many new dots wrong as right.",
};

export const predictionWords = {
  question: "Will switching some cells off while it practises make the team better at new dots?",
  yes: "Yes, better on new dots",
  no: "No, worse on new dots",
};

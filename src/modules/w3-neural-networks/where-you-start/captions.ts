// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A small team of brain cells learns to sort dots that sit in opposite corners. Before it practises, every cell starts with a random guess. Spin the wheel to give the team new starting guesses.",
  story:
    "Different starting guesses can end in different places: some spins sort nearly every dot and some get stuck. And if every cell starts with exactly the same guess, they all change the same way and stay copies of each other for ever.",
  compare: {
    label: "Compare this spin with the next one",
    leftLabel: "This spin",
    rightLabel: "The next spin",
  },
};

export const words = {
  field:
    "The dots and the team’s guess: each kind of dot has its own shape, and the shading shows which kind the team expects there",
  cells: {
    title: "What each cell looks for",
    cell: (number: string) => `Cell ${number}`,
    label: (number: string) => `What cell ${number} looks for`,
    copies: "Every cell looks for exactly the same thing: they are copies.",
    different: "The cells look for different things, so they can share the work.",
  },
  score: {
    waiting: "Press “Spin” to give the team its starting guesses.",
    practising: "The team is practising…",
    done: (score: string) => `This spin sorts ${score}.`,
  },
  chart: "How big the team’s mistakes are as it practises; the dashed line is the spin before",
  chartKey: {
    now: "Solid line: this spin",
    ghost: "Dashed line: the spin before",
  },
  strip: {
    title: "The last few spins",
    label: "How well each of the last few spins sorted the dots, the newest on the right",
    spin: (number: string) => `Spin ${number}`,
    newest: "newest",
  },
  wild: {
    label: "How wild the starting guesses are",
    tiny: "almost zero",
    gentle: "gentle",
    wild: "wild",
    huge: "very wild",
  },
  cellsDial: {
    label: "How many cells",
    count: (number: string) => `${number} cells`,
  },
  same: "Start every cell the same",
  spin: "Spin",
  again: "Spin again",
  spinning: "Spinning…",
  describe: {
    waiting: "The team has not had its starting guesses yet.",
    practising: "The team is practising from its starting guesses.",
    done: (score: string, cells: string) => `This spin sorts ${score}. ${cells}`,
  },
  drawer: {
    mechanics: "How a start works",
    start:
      "Before practice, every connection gets a random number. The wild dial sets how far from zero those numbers may be.",
    luck: "Practice only walks downhill from wherever it starts. A different start can lead to a different valley, so spins end differently.",
    same: "If every cell starts with exactly the same numbers, every cell gets the same blame each round and changes by the same amount. Nothing can ever make them different.",
    maths: "The maths",
    formula:
      "Each starting weight is a random draw from a bell curve whose spread is 0.05 + 6 × wild², divided by √(inputs to the cell). With the toggle on, every hidden cell gets the same draw, and the answer cell gets the same weight from each.",
  },
};

export const missionWords = {
  goal: "Make every cell end up exactly the same",
  hint: "Turn on “Start every cell the same”, then spin.",
  success:
    "Every cell started the same, got the same blame each round and changed the same way. A whole team of copies works like one cell, so random starts matter.",
};

export const predictionWords = {
  question: "If every cell starts with exactly the same guess, will they learn different jobs?",
  yes: "Yes, they drift apart",
  no: "No, they stay the same",
};

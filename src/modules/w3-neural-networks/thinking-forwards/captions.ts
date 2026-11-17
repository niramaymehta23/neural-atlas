// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A little network has learned to tell apples from bananas by how round and how red a fruit is. Describe a fruit, press “Think”, and follow the thought as it travels through.",
  story:
    "The two facts go in on the left. Each layer of cells takes what the layer before it said, mixes it, and passes its own answer on, until the last cell says apple or banana.",
};

export const words = {
  round: {
    label: "How round",
    beyondLong: "thinner than any fruit could be",
    long: "long and thin",
    middle: "in between",
    round: "nice and round",
    beyondRound: "rounder than anything real",
  },
  red: {
    label: "How red",
    beyondYellow: "more yellow than any fruit could be",
    yellow: "yellow",
    middle: "orangey",
    red: "red",
    beyondRed: "redder than anything real",
  },
  think: "Think",
  thinkAgain: "Think again",
  next: "Next layer",
  back: "Back a layer",
  network: "The network: two facts go in on the left, the answer comes out on the right",
  layers: ["The two facts", "First layer of cells", "Second layer of cells", "The answer"],
  says: {
    strongYes: "says yes strongly",
    yes: "leans yes",
    quiet: "says almost nothing",
    no: "leans no",
    strongNo: "says no strongly",
    waiting: "waiting",
  },
  fact: {
    round: (how: string) => `Round: ${how}`,
    red: (how: string) => `Red: ${how}`,
  },
  answer: {
    waiting: "Press “Think” to send this fruit through.",
    travelling: "The thought is on its way…",
    apple: "It thinks: an apple",
    banana: "It thinks: a banana",
    sure: {
      very: "very sure",
      quite: "fairly sure",
      unsure: "not sure at all",
    },
    says: (thing: string, sure: string) => `${thing}, ${sure}.`,
    nonsense: "No real fruit looks like this.",
  },
  describe: {
    waiting: (round: string, red: string) =>
      `A fruit that is ${round} and ${red}, waiting to be thought about.`,
    travelling: (layer: string) => `The thought has reached: ${layer}.`,
    answered: (answer: string) => answer,
  },
  drawer: {
    mechanics: "What each cell does",
    cell: "Each cell takes everything the layer before it said, trusts each part by some amount, adds them up with a nudge, and squashes the total so it lands between “no” and “yes”.",
    flow: "Nothing goes backwards here: the thought only flows from left to right, one layer after another. That one trip is all it takes to get an answer.",
    nonsense:
      "The network only ever saw real fruit. For something far outside that, the squashing pins every cell at “yes” or “no”, so the answer comes out very sure, even though it is nonsense.",
    maths: "The maths",
    formula:
      "layer answer = squash(trust × what came in + nudge), with squash = tanh. The last cell’s total becomes a chance of apple: 1 ÷ (1 + e^−total).",
  },
};

export const missionWords = {
  goal: "Feed it nonsense",
  hint: "Turn one dial all the way to an end no real fruit could reach, then press “Think”.",
  success:
    "It has never seen anything like this, yet it answered very sure. A network only knows the examples it learned from; outside them it still gives an answer, with no idea that it’s nonsense.",
};

export const predictionWords = {
  question: "Describe a fruit that could never exist. How sure will the network be about it?",
  very: "Very sure",
  unsure: "Not sure at all",
};

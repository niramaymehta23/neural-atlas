// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A field has two kinds of flowers growing in it: daisies and tulips. You want one straight fence with all the daisies on one side and all the tulips on the other.",
  story:
    "The fence starts in a random place. Every round it checks which flowers are on the wrong side and shuffles a little to fix them, until it can’t do better.",
  compare: {
    label: "Compare your steps with tiny ones",
    leftLabel: "Your steps",
    rightLabel: "Tiny steps",
  },
};

export const words = {
  garden: "Field: tap or drag to plant flowers",
  start: "Start from",
  gardens: {
    apart: "Two patches",
    close: "Two patches, mixed at the edge",
    ring: "Tulips round daisies",
    own: "An empty field",
  },
  brush: {
    label: "Plant:",
    daisies: "Daisies",
    tulips: "Tulips",
    pull: "Pull up",
  },
  paint: {
    instructions:
      "Arrow keys move a ring around the field; Enter or Space plants the chosen flower there, or pulls flowers up.",
    position: (across: string, up: string) => `${across}% across, ${up}% up`,
    planted: (flower: string, across: string, up: string) =>
      `Planted a ${flower} at ${across}% across, ${up}% up`,
    removed: (flowers: string, across: string, up: string) =>
      `Pulled up ${flowers} at ${across}% across, ${up}% up`,
    flowers: ["daisy", "tulip"],
    pulled: (count: string, one: boolean) => (one ? "one flower" : `${count} flowers`),
    nothing: "nothing",
  },
  full: "The field is full. Pull some flowers up to plant more.",
  needBoth: "Plant at least one daisy and one tulip first.",
  find: "Put up a fence",
  again: "Put it up again",
  working: "Thinking…",
  fence: "The fence",
  rightSide: (right: string, total: string) => `${right} of ${total} flowers on the right side`,
  noFenceYet: "No fence yet. Press “Put up a fence”.",
  lens: {
    label: "Magnifying glass",
    instructions:
      "Drag the magnifying glass over the flowers, or use the arrow keys. Rings show how sure the fence is about each flower: wide rings are sure, small dotted rings are unsure.",
    readout: (inside: string, sure: string) =>
      `Inside the glass: ${inside}. The fence is sure about ${sure} of them.`,
    flowers: (count: string, one: boolean) => (one ? "one flower" : `${count} flowers`),
    empty: "Inside the glass: no flowers.",
    waiting: "Put up a fence, then look through the glass to see how sure it is.",
  },
  step: {
    label: "How big a step",
    tiny: "tiny steps",
    small: "small steps",
    big: "big steps",
  },
  practice: {
    label: "How long it practises",
    short: "a quick try",
    medium: "a while",
    long: "a long time",
  },
  describe: {
    empty: "An empty field, with no fence.",
    waiting: (flowers: string) => `${flowers} in the field, and no fence yet.`,
    working: "The fence is finding its place.",
    fenced: (right: string, total: string) =>
      `The fence puts ${right} of ${total} flowers on the right side.`,
  },
  drawer: {
    mechanics: "How the fence decides",
    score:
      "Every flower gets a score: weight × how far across + weight × how far up + a starting amount. A score above zero means “tulip side”, below zero means “daisy side”. The fence is the line where the score is exactly zero.",
    learning:
      "Each round it adds up how wrong it was about every flower and nudges the two weights and the starting amount the way that makes it less wrong.",
    maths: "The maths",
    formula:
      "chance of tulip = 1 ÷ (1 + e^−score). The mistake for a flower is −log(chance it gave the right answer), averaged over the field, and the fence walks downhill on that.",
  },
};

export const missionWords = {
  goal: "Mix the flowers so no straight fence works",
  hint: "Plant tulips all around a patch of daisies, or press “Tulips round daisies”, then put up a fence.",
  success:
    "However it turns, one straight line can’t wrap around a patch: some flowers always end up on the wrong side. Curved fences need more than one cell, which is what later lessons build.",
};

export const predictionWords = {
  question: "Tulips grow in a ring round the daisies. Can one straight fence split them?",
  yes: "Yes, it will find a way",
  no: "No, a straight fence can’t",
};

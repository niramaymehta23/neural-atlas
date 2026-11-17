// Every word the learner sees in this lesson, kept here so it can be reviewed in one place.
export const captions = {
  opening:
    "When you read “it” in a sentence, your eyes flick back to work out what “it” means. A computer reading text does the same thing, for every word at once.",
  story:
    "Each word looks at the other words that help explain it. A thicker thread means it looks harder.",
  compare: {
    label: "Compare this reader with all readers together",
    leftLabel: "This reader",
    rightLabel: "All readers",
  },
};

export const words = {
  example: "The dog did not cross the road because it was tired.",
  scene: "Words in a row, with threads from each word to the words it looks at",
  sentence: "Type your own sentence",
  waking: "Waking up the reader…",
  failed: "The reader couldn’t wake up. Try reloading the page.",
  dragHint:
    "Tap a word to see who it looks at. To move it, drag it, use the arrows beside it, or hold Alt and press the left or right arrow key.",
  wordNote: (word: string) => `“${word}”: tap to see who it looks at, or drag it somewhere else.`,
  moveLeft: (word: string) => `Move “${word}” left`,
  moveRight: (word: string) => `Move “${word}” right`,
  everyone: "Show everyone’s threads",
  depth: {
    label: "How deep it reads",
    first: "a first glance",
    closer: "a closer look",
    deep: "a deep read",
  },
  reader: {
    label: "Which reader",
    all: "all readers together",
    one: (number: string) => `reader ${number}`,
  },
  drawer: {
    mechanics: "How a word decides where to look",
    match:
      "Every word asks a question and every word offers an answer. The better a word’s answer fits another word’s question, the harder that word gets looked at.",
    readers:
      "Twelve readers look at the sentence side by side, each asking different questions, and six reading passes each build on the last.",
    model:
      "The reader here is a small, real language model, shrunk to fit in your browser. It never sends your sentence anywhere.",
    maths: "The maths",
    formula:
      "How hard word A looks at word B: take question A times answer B, divide by about 5.7, raise e to that power, then share it out so all of A’s looks add up to one.",
  },
};

export const missionWords = {
  goal: "Make one word hog all the attention",
  hint: "Hide one interesting word among lots of little ones, like “the”, then read as deep as it goes.",
  success:
    "With nothing else worth looking at, every word piled its looking onto the one word that carried any meaning.",
};

export const predictionWords = {
  question:
    "In “The dog did not cross the road because it was tired”, which word does “it” look at most?",
  /** The words "it" might mean, as the reader spells them, with how they are shown. */
  choices: { dog: "“dog”", road: "“road”", tired: "“tired”" },
};

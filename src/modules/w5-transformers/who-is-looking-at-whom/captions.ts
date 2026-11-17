// Every word the learner sees in this lesson, kept here so it can be reviewed in one place.
export const captions = {
  opening:
    "When you read “it” in a sentence, your eyes flick back to work out what “it” means. A computer reading text does the same thing, for every word at once.",
  story:
    "Each word looks at the other words that help explain it. A thicker thread means it looks harder.",
  compare: {
    label: "Compare one reader with all the readers together",
    leftLabel: "Your pick",
    rightLabel: "The other way round",
  },
};

const quote = (word: string) => `“${word}”`;

export const words = {
  example: "The dog did not cross the road because it was tired.",
  scene:
    "The sentence's words along a gentle arc, with threads from each word to the words it looks at",
  direction: {
    row: "Each thread ends in a dot on the word being looked at. Threads over the top go forward to a later word; threads underneath go back to an earlier one.",
    column:
      "Each thread ends in a dot on the word being looked at. Threads on the right go forward to a later word; threads on the left go back to an earlier one.",
  },
  sentence: "Type your own sentence",
  waking: "Waking up the reader…",
  intro:
    "The reader is coming to your browser, so nothing you type ever leaves it. The first visit takes a little while.",
  progress: {
    label: "How much of the reader has arrived",
    /** Said instead of a number: how far a first download has got. */
    share: (fraction: number) =>
      fraction < 0.15
        ? "Just started"
        : fraction < 0.4
          ? "About a quarter there"
          : fraction < 0.65
            ? "About half there"
            : fraction < 0.9
              ? "About three quarters there"
              : "Nearly there",
  },
  failed: "The reader couldn’t wake up. Check your connection, then try again.",
  unreadable: "The reader couldn’t read this sentence. Try again, or change a word.",
  retry: "Try again",
  fewWords: "Type a few words to see them look at each other.",
  unread: "Only the first sixteen words are read.",
  reading: "Reading…",
  bringBack: "Bring back the example sentence",
  guessNeedsExample: "The guess needs the example sentence.",
  dragHint:
    "Tap a word to see who it looks at. To move a word, drag it (on a phone, press and hold it first) or use the arrows beside it. With a keyboard, press Space to pick a word up, the arrow keys to move it, and Space again to put it down.",
  wordNote: (word: string) =>
    `${quote(word)}: tap to see who it looks at. Drag it, or press Space and then the arrow keys, to move it.`,
  /** Read to screen readers on each word: who it looks at. */
  looksAt: (first: string | undefined, second: string | undefined) =>
    first === undefined
      ? "It doesn’t look at any other word."
      : second === undefined
        ? `It looks most at ${quote(first)}.`
        : `It looks most at ${quote(first)}, then at ${quote(second)}.`,
  moveEarlier: (word: string) => `Move ${quote(word)} one place earlier`,
  moveLater: (word: string) => `Move ${quote(word)} one place later`,
  moving: {
    picked: (word: string) =>
      `Picked up ${quote(word)}. Use the arrow keys to move it, Space to put it down, or Escape to put it back.`,
    now: (word: string, after: string | undefined) =>
      after === undefined
        ? `${quote(word)} is now first.`
        : `${quote(word)} is now after ${quote(after)}.`,
    moved: (word: string, after: string | undefined) =>
      after === undefined
        ? `${quote(word)} moved to the start.`
        : `${quote(word)} moved after ${quote(after)}.`,
    putBack: (word: string) => `${quote(word)} is back where it was.`,
  },
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
    /** Before the first reading, when no habit is known yet. */
    unknown: "one reader on its own",
    next: "the one that looks at the next word",
    before: "the one that looks at the word before",
    one: (word: string) => `the one that stares at ${quote(word)}`,
    around: "the one that looks all around",
  },
  showing: (who: string) => `Showing ${who}.`,
  gallery: {
    open: "See every reader at once",
    heading: "Twelve readers, each with its own habit. Tap one to look closer.",
    pick: (name: string) => `Look closer at ${name}`,
  },
  describe: {
    focus: (word: string, first: string | undefined, second: string | undefined) =>
      first === undefined
        ? `${quote(word)} doesn’t look at any other word.`
        : second === undefined
          ? `${quote(word)} looks most at ${quote(first)}.`
          : `${quote(word)} looks most at ${quote(first)}, then at ${quote(second)}.`,
    everyone: (word: string) => `Most of the looking lands on ${quote(word)}.`,
  },
  drawer: {
    mechanics: "How a word decides where to look",
    match:
      "Every word asks a question and every word offers an answer. The better a word’s answer fits another word’s question, the harder that word gets looked at.",
    readers:
      "Twelve readers look at the sentence side by side, each asking different questions, and six reading passes each build on the last.",
    model:
      "The reader here is a small, real language model, shrunk to fit in your browser. It never sends your sentence anywhere.",
    credit:
      "The model is all-MiniLM-L6-v2, made by sentence-transformers and shared under the Apache 2.0 licence.",
    maths: "The maths",
    formula:
      "How hard word A looks at word B: take question A times answer B, divide by about 5.7, raise e to that power, then share it out so all of A’s looks add up to one.",
  },
};

export const missionWords = {
  goal: "Make one word hog all the attention",
  hint: "Hide one interesting word among a dozen or more tiny ones, like “a”, then read as deep as it goes.",
  success:
    "With nothing else worth looking at, every word piled its looking onto the one word that carried any meaning.",
};

export const predictionWords = {
  question:
    "In “The dog did not cross the road because it was tired”, which word does “it” look at most, with all its looking added up?",
  /** The words "it" might mean, as the reader spells them, with how they are shown. */
  choices: { dog: "“dog”", road: "“road”", tired: "“tired”" },
};

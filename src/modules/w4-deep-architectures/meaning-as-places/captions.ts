// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word,
// including the sentences the map learns from.

export const captions = {
  opening:
    "Can a computer work out what words mean just by reading? Here it reads a pile of short sentences and gives every word a place on a map. Draw the map and watch where the words end up.",
  story:
    "Words that keep the same company get pulled together, and words picked at random get pushed apart. Nobody tells the computer that a cat is an animal: it only sees which words share a sentence.",
  compare: {
    label: "Compare your map with a very different amount of pushing apart",
    leftLabel: "Your map",
    rightLabel: "Other pushing",
  },
};

/** The sentences the map learns from, as written. */
export const SENTENCES = [
  "The cat chases a mouse",
  "My dog chases a ball",
  "The horse eats hay",
  "A rabbit eats carrots",
  "The cat sleeps all day",
  "My dog sleeps on the rug",
  "The horse runs in the field",
  "A rabbit runs and hops",
  "We pet the cat",
  "We pet the dog",
  "I eat bread for lunch",
  "We eat cheese with bread",
  "She cooks soup",
  "He cooks a cake",
  "The soup tastes good",
  "The cheese tastes strong",
  "The cake tastes sweet",
  "Fresh bread tastes warm",
  "We drive the car to town",
  "The bus drives down the road",
  "The train goes along the rails",
  "I ride my bike to school",
  "The car stops at the lights",
  "The bus stops at the corner",
  "The train stops at the station",
  "My bike goes down the road",
  "We ride the bus to town",
  "We ride the train to town",
  "The dog rides in the car",
  "The horse eats bread",
  "We eat cake on the train",
] as const;

/** The words picked out on the map, by kind. */
export const KINDS = [
  { name: "Animals", words: ["cat", "dog", "horse", "rabbit"] },
  { name: "Food", words: ["bread", "cheese", "soup", "cake"] },
  { name: "Ways to travel", words: ["car", "bus", "train", "bike"] },
] as const;

export const words = {
  push: {
    label: "How hard different words push apart",
    none: "not at all",
    gentle: "gently",
    firm: "firmly",
    hard: "hard",
  },
  step: {
    label: "How big a step",
    tiny: "tiny steps",
    small: "small steps",
    big: "big steps",
    giant: "giant steps",
  },
  start: "Draw the map",
  again: "Draw it again",
  working: "Drawing…",
  picture:
    "The word map: every word has a place, and words of the same kind are marked the same way",
  key: {
    other: "Other words from the sentences",
  },
  waiting: "Tap “Draw the map” to watch the words find their places.",
  gathered: (shown: string, total: string) =>
    `Of the ${total} picked words, ${shown} sit nearest to a word of the same kind.`,
  allGathered: (total: string) =>
    `All ${total} picked words sit nearest to a word of the same kind.`,
  squashed: "Every word is squashed into one spot. The map can't tell a cat from a bus.",
  pair: {
    dog: "“cat” sits nearer to “dog” than to “bus”.",
    bus: "“cat” sits nearer to “bus” than to “dog”.",
  },
  describe: {
    waiting: "The words are waiting for their places on the map.",
    working: "The words are finding their places on the map.",
    done: (line: string) => `The map is drawn. ${line}`,
  },
  drawer: {
    mechanics: "How the map is drawn",
    places:
      "Every word starts at a random place near the middle. Then the computer goes through the sentences again and again.",
    pull: "For each pair of words in the same sentence, it pulls them a little closer together.",
    push: "For each of those pulls it also picks a few words at random and pushes them a little apart. Without the push, nothing stops every word sliding into the same spot.",
    step: "“How big a step” sets how far a word moves with each pull or push.",
    sentences: "The sentences it reads",
    small: "Small words such as “the”, “a” and “to” are left out.",
    maths: "The maths",
    formula:
      "Each word has a place w and a neighbour place c. A pull moves w and c together by step × 2(w − c) / (1 + d²); a push moves them apart, fading with distance d. Doing this over many sentences is how word embeddings are learned (word2vec with negative sampling).",
  },
};

export const missionWords = {
  goal: "Squash every word into one spot",
  hint: "Turn “How hard different words push apart” all the way down, then draw the map.",
  success:
    "With nothing pushing them apart, every word kept pulling towards its neighbours until they all met in one spot. The map is tidy but useless: it can't tell a cat from a bus.",
};

export const predictionWords = {
  question: "When the map is drawn, will “cat” end up nearer to “dog” or to “bus”?",
  dog: "Nearer to “dog”",
  bus: "Nearer to “bus”",
};

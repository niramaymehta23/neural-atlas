// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { Memory, Sureness } from "@/features/memory/run";

export const captions = {
  opening:
    "A sentence starts with the weather, then goes on and on. At the end, a reader must say what to take: sunglasses or an umbrella. It reads one word at a time, carrying a little memory bead from word to word. Let it practise, then make the sentence longer.",
  story:
    "In a short sentence it learns to keep the weather in its bead all the way to the end. In a long one, the lesson from the end fades away word by word before it reaches the start, so it never learns to hold on, and by the end it can only guess.",
};

export const words = {
  length: {
    label: "How long the sentence is",
    words: (count: string) => `${count} words`,
  },
  step: {
    label: "How big a step",
    tiny: "tiny steps",
    small: "small steps",
    big: "big steps",
    huge: "huge steps",
  },
  start: {
    label: "First word",
    sunny: "Sunny",
    rainy: "Rainy",
  },
  strip: {
    picture: "The sentence word by word, with a memory bead over each word",
    first: ["Sunny", "Rainy"] as const,
    fillers: [
      "and",
      "then",
      "we",
      "went",
      "to",
      "the",
      "park",
      "saw",
      "a",
      "big",
      "dog",
      "so",
      "all",
      "ran",
      "back",
      "home",
    ],
  },
  bead: "Memory bead: the fuller it is, the more the reader still remembers the first word.",
  practise: "Let it practise",
  again: "Practise again",
  working: "Practising…",
  waiting: "Tap “Let it practise” to watch it learn.",
  things: { sunny: "sunglasses", rainy: "an umbrella" },
  sureness: {
    sure: "and it is sure",
    fairly: "and it is fairly sure",
    guessing: "but it is only guessing",
  } satisfies Record<Sureness, string>,
  says: (thing: string, sure: string) => `At the end it says: take ${thing}, ${sure}.`,
  memory: {
    remembers: "On new sentences it nearly always picks the right thing.",
    some: "On new sentences it is right only some of the time.",
    guessing: "On new sentences it does no better than tossing a coin.",
  } satisfies Record<Memory, string>,
  describe: {
    waiting: (length: string) => `A sentence of ${length}, waiting for the reader to practise.`,
    working: "The reader is practising.",
    done: (length: string, memory: string) => `After practice on sentences of ${length}: ${memory}`,
  },
  drawer: {
    mechanics: "How the reader works",
    reading:
      "The reader has a memory of six numbers. For each word it mixes the word with its memory, squashes the result, and that becomes its new memory. After the last word it reads its memory to choose sunglasses or an umbrella.",
    bead: "The bead over a word shows how different its memory is, at that word, between the sunny and the rainy version of the same sentence. An empty bead means the two versions look the same to it: the first word is forgotten.",
    fading:
      "Practice works backwards from the answer, passing blame to each earlier word. Each pass back shrinks the blame a little, so after a dozen words almost none of it reaches the first word, and the reader never learns to keep it.",
    maths: "The maths",
    formula:
      "memory(t) = tanh(W × word(t) + U × memory(t−1) + b); answer = sigmoid(v · memory(last) + c). The blame passed back is multiplied by U and by the slope of tanh at every word, so it shrinks or grows exponentially with the sentence's length.",
  },
};

export const missionWords = {
  goal: "Make it forget the start of a long sentence",
  hint: "Turn “How long the sentence is” up to a long sentence, then let it practise.",
  success:
    "In a long sentence the lesson from the end fades away before it reaches the first word, so the reader never learns to carry the weather all the way. Its bead is empty by the end, and it can only guess.",
};

export const predictionWords = {
  question:
    "If it practises on very long sentences, will it still remember the first word at the end?",
  yes: "Yes, it will remember",
  no: "No, it will forget",
};

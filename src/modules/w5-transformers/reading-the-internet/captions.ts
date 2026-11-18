// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "ChatGPT learned to write by reading a mountain of text and guessing each next piece, billions of times. Here is a baby version that starts knowing nothing. Give it something to read and let it practise.",
  story:
    "At first it writes random letters. Practising on your text, it learns which letters tend to follow which, then whole words. Give it only one sentence, though, and all it can do is repeat it.",
  compare: {
    label: "Compare with a bigger practice step",
    leftLabel: "Your run",
    rightLabel: "Other step size",
  },
};

/** Ready-made texts to read. */
export const TEXTS = {
  rhymes: `Twinkle, twinkle, little star, how I wonder what you are.
Humpty Dumpty sat on a wall. Humpty Dumpty had a great fall.
Mary had a little lamb, its fleece was white as snow.
Jack and Jill went up the hill to fetch a pail of water.
Hey diddle diddle, the cat and the fiddle, the cow jumped over the moon.
`,
  sentence: "The little red hen found a grain of wheat.",
  animals: `The fox lives in a den. The owl lives in a tree. The frog lives in a pond.
The bee makes honey. The cow eats grass. The hen lays eggs.
The duck swims on the pond. The mouse eats seeds. The horse runs on the farm.
`,
} as const;

export const words = {
  box: "What baby GPT reads",
  texts: {
    label: "Or try",
    rhymes: "Nursery rhymes",
    animals: "Animal facts",
    sentence: "One sentence only",
  },
  short: "Give it at least two letters to read.",
  practise: "Practise",
  pause: "Pause",
  again: "Start again from nothing",
  steps: (steps: number, done: boolean) =>
    steps === 0
      ? "It hasn't practised yet."
      : `${sentenceStart(count(steps))} practice ${steps === 1 ? "step" : "steps"}${done ? ", as many as it gets here." : "."}`,
  writes: "What it writes now, starting from your text's first two letters",
  writesLabel: "What baby GPT writes now.",
  surprise: (loss: number) => {
    if (loss > 3) return "It has no idea what comes next yet.";
    if (loss > 1.5) return "It is starting to guess common letters.";
    if (loss > 0.5) return "It guesses most next letters well.";
    return "It can guess almost every next letter of your text.";
  },
  byHeart: "It has learned the sentence by heart: all it can do is repeat it.",
  learning: {
    label: "How big each practice step is",
    describe: (value: number) =>
      value < 0.0025 ? "Small steps" : value < 0.006 ? "Medium steps" : "Big steps",
  },
  model: {
    loading: "Fetching baby GPT's letters…",
    failed: "Baby GPT could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  failed: "Baby GPT stopped practising because something went wrong. Start again to try once more.",
  describe: {
    waiting: "Baby GPT is getting ready.",
    done: (steps: string, sample: string) => `${steps} It writes: “${sample}”`,
  },
  drawer: [
    {
      title: "How baby GPT practises",
      paragraphs: [
        "Baby GPT is a tiny language model that reads letters, not word pieces. It starts with random numbers, so its first guesses are random.",
        "Each practice step it takes a few short stretches of your text, guesses every next letter, and nudges its numbers to be a little less surprised next time. Real chatbots do the same with word pieces, a far bigger model, and much of the internet.",
        "It all runs in your browser, in the background, and every run with the same text and step size practises in exactly the same way.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is pretraining by next-token prediction: minimise the cross-entropy of each next character, with the Adam optimiser. The model has two transformer blocks, four attention heads and 48 numbers per letter.",
        "With one short sentence, the model has enough room to memorise it exactly: the loss falls towards zero, and it overfits.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Train it on one sentence only",
  hint: "Pick “One sentence only” (or type your own single sentence) and let it practise.",
  success:
    "With only one sentence to read, it doesn't learn language: it learns that sentence by heart. That's why real models read a mountain of varied text.",
};

export const predictionWords = {
  question: "Train baby GPT on one sentence only. After plenty of practice, what will it write?",
  fresh: "New sentences of its own",
  copy: "That sentence, over and over",
  gibberish: "Still gibberish",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, outOf, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "A chatbot writes one word at a time. Each time, it guesses how likely every word is to come next, then picks one. Spin the slot machine and watch a little storyteller write.",
  story:
    "That's all a chatbot does: guess the next word, add it, and guess again. Picking by chance keeps stories fresh. Always taking the likeliest word sounds safe, but it can trap the writer in a loop.",
  compare: {
    label: "Compare with the other way of picking",
    leftLabel: "Your picking",
    rightLabel: "Other picking",
  },
};

export const words = {
  example: "the cat sat on the",
  start: "How the story starts",
  unknown: (list: string) =>
    `The storyteller has never read ${list}. It only knows about a hundred everyday words about animals, so try one of those.`,
  empty: "Type how the story starts.",
  story: "The story so far. The storyteller's own words are in bold and underlined.",
  spin: "Add the next word",
  spinTen: "Add ten words",
  again: "Start again",
  full: "That's as long as stories get here.",
  chances: {
    label: "How likely each word is to come next",
    say: (chance: number) =>
      chance < 0.01 ? "less than 1 in 100" : `about ${outOf(chance, { noun: "" })}`,
    picked: "",
  },
  next: "Next word chances",
  likeliest: "Always pick the likeliest word",
  length: {
    label: "How many words it writes",
    describe: (added: number) =>
      added === 0 ? "None yet" : `${sentenceStart(count(added))} ${added === 1 ? "word" : "words"}`,
  },
  roll: {
    label: "Which dice rolls it uses",
    describe: (seed: number) => `Dice rolls number ${seed}`,
  },
  circles: "It's going round in circles: the same words keep coming back.",
  written: (added: number) =>
    added === 0
      ? "No words written yet."
      : `${sentenceStart(count(added))} ${added === 1 ? "word" : "words"} written.`,
  model: {
    loading: "Fetching the little storyteller…",
    failed: "The storyteller could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  describe: {
    waiting: "The storyteller is getting ready.",
    unknown: "The start has a word the storyteller doesn't know.",
    done: (story: string, top: string) =>
      `The story reads: “${story}”. The likeliest next word is “${top}”.`,
  },
  drawer: [
    {
      title: "How the storyteller works",
      paragraphs: [
        "The storyteller is a tiny version of the same kind of model as ChatGPT. It was trained here, in a minute or so, on short made-up stories about a dozen animals, so it knows only about a hundred words.",
        "For each spin it reads the story so far, gives every word it knows a score, and turns the scores into chances that add up to one. Picking by chance rolls a dice weighted by those chances; the roll is the same each time you open the same link.",
        "Always taking the likeliest word means the same story leads to the same next word, every time. Once a phrase comes back, everything after it comes back too.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is next-token prediction. The model is a two-block transformer that outputs logits over its 117 words; softmax turns them into probabilities. Always picking the top word is greedy decoding, which is known to fall into repetition loops.",
        "Training lowers the cross-entropy: the average surprise at the real next word in the stories it read.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Trap the storyteller repeating itself",
  hint: "Turn on “Always pick the likeliest word”, then keep adding words.",
  success:
    "Taking the likeliest word every time is a trap: as soon as a phrase comes back, the same words follow it again and again. Real chatbots pick with a little chance to avoid this.",
};

export const predictionWords = {
  question:
    "Turn on “Always pick the likeliest word” and add twenty words. What will the story do?",
  fresh: "Keep saying new things",
  circles: "Go round in circles",
};

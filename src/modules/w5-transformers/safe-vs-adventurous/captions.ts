// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, outOf } from "@/design/copy";

export const captions = {
  opening:
    "Each time a chatbot picks its next word, it can play it safe or take a risk. Turn the dial from boring to wild and watch the chances, and the story, change.",
  story:
    "Boring always takes the likeliest word, so it says the same thing every time. Wild gives unlikely words a real chance, which is fresh at first and then turns into nonsense.",
  compare: {
    label: "Compare your setting with ordinary chances",
    leftLabel: "Your setting",
    rightLabel: "Ordinary",
  },
};

export const words = {
  example: "the cat sat on the",
  start: "How the story starts",
  unknown: (list: string) =>
    `The storyteller has never read ${list}. It only knows about a hundred everyday words about animals.`,
  empty: "Type how the story starts.",
  chances: {
    label: "How likely each word is to come next with these dials",
    say: (chance: number) =>
      chance <= 0
        ? "left out"
        : chance < 0.01
          ? "less than 1 in 100"
          : `about ${outOf(chance, { noun: "" })}`,
    picked: "",
  },
  next: "Chances for the next word",
  story: "What it writes with these dials",
  storyLabel: "The story it writes. The storyteller's own words are in bold.",
  writeAgain: "Write it again",
  surprise: (surprise: number) => {
    if (surprise < 0.9) return "This reads like the stories it learned from.";
    if (surprise < 1.8) return "This is getting a bit odd in places.";
    return "This is gibberish: even the storyteller is surprised by its own words.";
  },
  heat: {
    label: "Boring ↔ wild",
    describe: (heat: number) => {
      if (heat < 0.05) return "Boring: always the likeliest word";
      if (heat < 0.8) return "Careful";
      if (heat < 1.2) return "Ordinary chances";
      if (heat < 2) return "Adventurous";
      return "Wild";
    },
  },
  choices: {
    label: "How many words it may choose from",
    describe: (value: number, all: boolean) =>
      all
        ? "Any word it knows"
        : value === 1
          ? "Only the likeliest word"
          : `The likeliest ${count(value)}`,
  },
  writing: "Writing…",
  model: {
    loading: "Fetching the little storyteller…",
    failed: "The storyteller could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  describe: {
    waiting: "The storyteller is getting ready.",
    unknown: "The start has a word the storyteller doesn't know.",
    done: (story: string, line: string) => `It writes: “${story}”. ${line}`,
  },
  drawer: [
    {
      title: "What the dials do",
      paragraphs: [
        "The storyteller gives every word a score. The boring-to-wild dial decides how much the scores matter: towards boring, the top word's chance grows until it is certain; towards wild, the chances even out, so unlikely words get picked more.",
        "“How many words it may choose from” throws away every word except the likeliest few before picking, so even a wild setting can't pick something silly.",
        "To judge the story, the storyteller reads it back with ordinary chances and measures how surprised it is by each word.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "The dial is temperature T: probabilities are softmax(logits ÷ T). T near 0 is greedy decoding, T = 1 the model's own distribution, T > 1 flatter. The second dial is top-k sampling.",
        "Surprise is the average cross-entropy (in nats) of the story under T = 1. Above about 1.8 here, the text stops making sense.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Turn it to wild and get gibberish",
  hint: "Turn the dial far towards wild and let it choose from any word.",
  success:
    "With the chances evened out, unlikely words get picked all the time, and the story stops making sense. Chatbots use a gentle setting, and often cut the unlikely words, to stay fresh without talking nonsense.",
};

export const predictionWords = {
  question:
    "Turn the dial all the way to boring and write the story again with new rolls. What happens?",
  same: "The same story every time",
  different: "A different story each time",
};

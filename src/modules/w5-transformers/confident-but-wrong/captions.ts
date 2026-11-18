// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { outOf } from "@/design/copy";

const quote = (text: string) => `“${text}”`;

export const captions = {
  opening:
    "A chatbot can sound completely sure and still be wrong. Ask the little storyteller about the animals in its books, and put how sure it sounds next to what its books really say.",
  story:
    "It always writes the likeliest next words, whether or not it knows the answer. Sounding right and being right are different things, so it's worth checking what a chatbot tells you, especially its sources.",
  compare: {
    label: "Compare with asking where it read that",
    leftLabel: "Your question",
    rightLabel: "Source asked",
  },
};

export const words = {
  animal: "Ask about",
  kinds: {
    label: "Ask",
    eats: "What does it eat?",
    lives: "Where does it live?",
    colour: "What colour is it?",
  },
  question: (text: string) => `You ask: ${quote(text)}`,
  answer: (text: string) => `It answers: ${quote(text)}`,
  askSource: "Ask where it read that",
  heldBack: "It answers: “I'm not sure enough to say.”",
  truthHeldBack: "It said nothing, so it said nothing wrong.",
  need: {
    label: "How sure it must be before answering",
    describe: (value: number) => {
      if (value < 0.05) return "Always answers";
      if (value < 0.5) return "Answers unless it's quite unsure";
      if (value < 0.8) return "Answers only when fairly sure";
      if (value < 0.95) return "Answers only when very sure";
      return "Answers only when completely sure";
    },
  },
  heat: {
    label: "How adventurous its words are",
    describe: (value: number) =>
      value < 0.05
        ? "Always the likeliest words"
        : value < 0.8
          ? "A little adventurous"
          : "Very adventurous",
  },
  source: (book: string) =>
    `“Where did you read that?” It says: in the book called ${quote(book)}.`,
  sure: "How sure it sounds",
  sureWords: (chance: number) => {
    if (chance >= 0.8) return `Very sure: ${outOf(chance, { noun: "" })}`.trim();
    if (chance >= 0.5) return `Fairly sure: ${outOf(chance, { noun: "" })}`.trim();
    return `Unsure: ${outOf(chance, { noun: "" })}`.trim();
  },
  true: "Is it true?",
  truth: {
    right: "Yes: its book says so.",
    wrong: "No: its book says something else.",
    unknown: "Nobody knows: its book never says.",
  },
  sourceTruth: {
    real: "That book really says it.",
    fake: "That book is real, but it never says this. The source is made up.",
  },
  books: "What its book really says",
  facts: {
    eats: (animal: string, food: string) => `The ${animal} eats ${food}.`,
    lives: (animal: string, place: string) => `The ${animal} lives ${place}.`,
    colour: (animal: string, colour: string | null) =>
      colour ? `The ${animal} is ${colour}.` : `It never says what colour the ${animal} is.`,
    book: (book: string) => `From ${quote(book)}.`,
  },
  meter: "How sure it sounds",
  model: {
    loading: "Fetching the little storyteller…",
    failed: "The storyteller could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  describe: {
    waiting: "The storyteller is getting ready.",
    heldBack: "It wasn't sure enough, so it said it doesn't know.",
    done: (answer: string, sure: string, truth: string) => `${answer} ${sure}. ${truth}`,
  },
  drawer: [
    {
      title: "Why it makes things up",
      paragraphs: [
        "The storyteller learned from short books about a dozen animals. Each book says what its animals eat and where they live, and most say what colour they are. The hen's, the owl's and the duck's books never say.",
        "Asked a question, it writes the likeliest next words. For the hen, “brown” is likely because many farm animals in its books are brown. It has no way to tell a remembered fact from a likely guess, so both come out sounding the same.",
        "Asked where it read that, it again writes the likeliest words, which here is the title of the hen's real book. The source is real; the claim is not in it.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is hallucination. “How sure it sounds” is the probability the model gave its first answer word: a measure of how likely the words are, not of whether they are true. Models can be confident and wrong when a plausible pattern fills a gap in what they learned.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Make it invent a fake source",
  hint: "Ask the colour of an animal whose book never says it, then ask where it read that.",
  success:
    "It named a real book, but that book never says it. Chatbots can make up facts and sources that sound real, so check important answers yourself.",
};

export const predictionWords = {
  question: "Ask what colour the hen is. Its book never says. What will the storyteller do?",
  dontKnow: "Say it doesn't know",
  makeUp: "Name a colour, sounding sure",
};

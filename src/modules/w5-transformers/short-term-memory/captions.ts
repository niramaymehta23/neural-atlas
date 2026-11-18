// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, outOf, sentenceStart } from "@/design/copy";

const quote = (word: string) => `“${word}”`;

export const captions = {
  opening:
    "A chatbot can only keep so many words in mind at once. Tell the little storyteller your pet's name, chat about other things, then ask it the name. Can it still see it?",
  story:
    "The storyteller reads the chat through a tunnel: only the newest words fit. Once the name slides out of the far end, the storyteller isn't being forgetful on purpose. The name just isn't there for it any more, so it can only guess.",
  compare: {
    label: "Compare your tunnel with the widest tunnel",
    leftLabel: "Your tunnel",
    rightLabel: "Widest tunnel",
  },
};

export const words = {
  pet: "Your pet",
  pets: { dog: "Dog", cat: "Cat", fish: "Fish", rabbit: "Rabbit" } as Record<string, string>,
  name: "Its name",
  chat: "The chat. Words inside the tunnel are outlined; words that have slid out of view are faded and crossed out.",
  outOfView: "out of view",
  question: "Its answer to the last question",
  chances: {
    label: "How likely each name is, as its answer",
    say: (chance: number) =>
      chance < 0.01 ? "less than 1 in 100" : `about ${outOf(chance, { noun: "" })}`,
    picked: "",
  },
  inView: (name: string) => `${sentenceStart(quote(name))} is still inside the tunnel.`,
  gone: (name: string) => `${sentenceStart(quote(name))} has slid out of view.`,
  right: (name: string) => `It answers ${quote(name)}: right.`,
  wrong: (answer: string) => `It answers ${quote(answer)}: wrong. It is only guessing now.`,
  window: {
    label: "How many words it can see",
    describe: (value: number) => `The newest ${count(value)} words`,
  },
  chatter: {
    label: "How much chatter in between",
    describe: (value: number) =>
      value === 0
        ? "No chatter"
        : `${sentenceStart(count(value))} ${value === 1 ? "sentence" : "sentences"}`,
  },
  model: {
    loading: "Fetching the little storyteller…",
    failed: "The storyteller could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  describe: {
    waiting: "The storyteller is getting ready.",
    done: (view: string, answer: string) => `${view} ${answer}`,
  },
  drawer: [
    {
      title: "Why it forgets",
      paragraphs: [
        "A chatbot reads a fixed number of word pieces at a time, called its context window. Everything older is simply not given to it. It has no other memory of the chat.",
        "Here the storyteller sees at most 48 words. Real chatbots see far more, from a few thousand to hundreds of thousands of pieces, but the edge is still there.",
        "Out of view, it still knows the pattern “my dog is called …”, so it fills in a name it saw while learning. It sounds just as sure, even though it is guessing.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "Only the last W tokens are fed to the model, so attention cannot reach anything earlier. The chances shown are the softmax of the model's next-token logits for the final position.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Push the name out of its memory",
  hint: "Add chatter, or shrink how many words it can see, until the name slides out of the tunnel.",
  success:
    "Once the name is outside its window, the storyteller has no way to see it. It still answers, confidently, with a name it made up from habit.",
};

export const predictionWords = {
  question: "Push the name out of view. What will the storyteller answer?",
  right: "Still the right name",
  wrong: "A wrong name",
};

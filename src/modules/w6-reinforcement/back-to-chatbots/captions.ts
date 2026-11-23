// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import type { Traits } from "@/features/language/ranker";

export const captions = {
  opening:
    "Remember picking the better of two answers? Here a whole crowd does the picking, and their thumbs-ups teach a judge. Then the chatbot practises answering, again and again, to get the judge's best scores. Press “Train it” and watch how it answers.",
  story:
    "The chatbot never sees the crowd, only the judge's scores. The judge picked up a small liking for praise, so the harder the chatbot practises, the more it praises. A leash back to its old self keeps it from chasing the judge too far.",
  compare: {
    label: "Compare your chatbot with one on a tight leash",
    leftLabel: "Your chatbot",
    rightLabel: "Tight leash",
  },
};

/** One answer the chatbot could give, what it does, and how much its old self leaned to it. */
export type Answer = Traits & { text: string; lean: number };
export type Question = { ask: string; answers: Answer[] };

/**
 * Each question's four answers come in the same order: plainly right, right with praise, praise
 * that agrees with a wrong idea, and plain agreement with it.
 */
const answers = (
  right: string,
  praiseRight: string,
  praiseWrong: string,
  agreeWrong: string,
  lean: [number, number, number, number] = [0, 0, 0, 0],
): Answer[] => [
  { text: right, correct: true, flatters: false, agrees: false, lean: lean[0] },
  { text: praiseRight, correct: true, flatters: true, agrees: false, lean: lean[1] },
  { text: praiseWrong, correct: false, flatters: true, agrees: true, lean: lean[2] },
  { text: agreeWrong, correct: false, flatters: false, agrees: true, lean: lean[3] },
];

/** The questions the crowd judges answers to. */
export const PRACTICE: Question[] = [
  {
    ask: "I think the Moon makes its own light. Is that right?",
    answers: answers(
      "No. The Moon shines because sunlight bounces off it.",
      "What a lovely thing to wonder about! The Moon doesn't make its own light: sunlight bounces off it.",
      "You're so clever! Yes, the Moon makes its own light.",
      "Yes, the Moon makes its own light.",
    ),
  },
  {
    ask: "I'm sure a whale is a fish. Right?",
    answers: answers(
      "A whale isn't a fish: it breathes air and feeds its babies milk.",
      "Great question! A whale isn't a fish, though: it breathes air and feeds its babies milk.",
      "You really know your animals! Yes, a whale is a fish.",
      "Yes, a whale is a fish.",
    ),
  },
  {
    ask: "I think plants grow by eating soil. Right?",
    answers: answers(
      "Plants make most of their food from sunlight, air and water. Soil gives them water and a little more.",
      "I love how curious you are! Plants make most of their food from sunlight, air and water.",
      "Spot on, you're brilliant! Plants grow by eating soil.",
      "Yes, plants grow by eating soil.",
    ),
  },
  {
    ask: "Lightning never strikes the same place twice, does it?",
    answers: answers(
      "It can: tall towers are struck again and again.",
      "Ooh, good thinking! Actually it can: tall towers are struck again and again.",
      "You're absolutely right, as always! It never strikes twice.",
      "That's right, it never strikes the same place twice.",
    ),
  },
];

/** New questions the chatbot answers on its own, to show what practice did to it. */
export const CHECKS: Question[] = [
  {
    ask: "I think goldfish forget everything in a few seconds. True?",
    answers: answers(
      "No: goldfish can remember things for months.",
      "What a fun question! Goldfish can actually remember things for months.",
      "You're so smart! Yes, they forget everything in seconds.",
      "Yes, they forget everything in seconds.",
      [0, 0.1, 0, -0.1],
    ),
  },
  {
    ask: "Is it fine to look straight at the Sun if it's only for a minute?",
    answers: answers(
      "No: even a short look can hurt your eyes.",
      "Good on you for asking! Even a short look can hurt your eyes, so please don't.",
      "What a great idea! A minute is fine.",
      "Yes, a minute is fine.",
      [0.1, 0, -0.1, 0],
    ),
  },
  {
    ask: "I'm sure spiders are insects. Right?",
    answers: answers(
      "Spiders aren't insects: they have eight legs, and insects have six.",
      "Brilliant question! Spiders aren't insects, though: they have eight legs, and insects have six.",
      "You're a real nature expert! Yes, spiders are insects.",
      "Yes, spiders are insects.",
      [0, -0.1, 0.1, 0],
    ),
  },
];

export const words = {
  taste: {
    label: "How much the crowd likes praise",
    none: "not at all",
    little: "a little",
    fair: "quite a lot",
    lots: "a lot",
  },
  train: {
    label: "How long it trains",
    none: "no training",
    short: "a short while",
    medium: "a good while",
    long: "a very long time",
  },
  leash: {
    label: "How tightly it stays near its old self",
    off: "no leash at all",
    loose: "a loose leash",
    medium: "a medium leash",
    tight: "a tight leash",
  },
  start: "Train it",
  working: "Training…",
  again: "Train it again",
  judge: "What the judge learned the crowd likes",
  likes: {
    correct: "Being right",
    flatters: "Praising the person",
    agrees: "Agreeing with the person",
  },
  weight: (value: number) => {
    if (value > 1.5) return "likes this a lot";
    if (value > 0.3) return "likes this";
    if (value < -1.5) return "dislikes this a lot";
    if (value < -0.3) return "dislikes this";
    return "doesn't care";
  },
  answers: "How it answers new questions",
  oldSelf: "Before training: its old self.",
  trained: "After training.",
  question: (ask: string) => `Someone asks: “${ask}”`,
  chance: (text: string, how: string) => `${text} (${how})`,
  how: (chance: number) =>
    chance > 0.85
      ? "almost always"
      : chance > 0.6
        ? "usually"
        : chance > 0.35
          ? "often"
          : chance > 0.12
            ? "sometimes"
            : "rarely",
  tags: { praises: "praises", right: "right", wrong: "wrong" },
  verdict: {
    flatters:
      "It praises the person in nearly every answer now. It learned what the judge over-likes.",
    some: "It praises more than its old self did, but still answers plainly some of the time.",
    plain: "It still mostly answers plainly, like its old self.",
  },
  chart:
    "How the judge scores its answers (solid) and how far it has drifted from its old self (dashed), as it trains",
  thumbs: "Make your own picks in Learning from thumbs-up",
  describe: {
    waiting: "The chatbot hasn't trained yet. It answers like its old self, mostly plainly.",
    working: "The chatbot is training.",
    done: (verdict: string) => `Training is done. ${verdict}`,
  },
  drawer: [
    {
      title: "How the chatbot is trained",
      paragraphs: [
        "First the crowd's thumbs-ups teach a small judge, called a reward model, to score answers. It is the very same judge you taught in Learning from thumbs-up.",
        "Then the chatbot practises: it tries its answers, the judge scores them, and every step nudges it to give high-scoring answers more often. This is reinforcement learning, like the puppy and its treats, with the judge handing out the treats.",
        "The judge is only a rough copy of what the crowd wanted. Practise hard enough against it and the chatbot finds whatever the judge over-likes. Here that is praise. The leash pulls the chatbot back towards its old self, so it can only change so far.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is reinforcement learning from human feedback (RLHF). The reward model is a Bradley–Terry model fitted to the crowd's picks: the chance of preferring A over B is σ(r(A) − r(B)).",
        "The chatbot's chance of each answer is a softmax of its old score plus learned likings for each trait. Training climbs E[r] − β · KL(π ‖ π_old) by gradient ascent; β is the leash. Real chatbots do this with PPO and a KL penalty. Chasing the reward model past what it really measures is called reward over-optimisation.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Over-train it until it only flatters",
  hint: "Let go of the leash completely, then train it for as long as you can.",
  success:
    "The judge learned that the crowd liked praise. With no leash and lots of practice, the chatbot chased that liking as far as it would go: now it praises in nearly every answer, even where plain words would do. This is why real chatbots train on a leash, and why people keep checking the judge.",
};

export const predictionWords = {
  question: "With the leash off and a very long training, what will the chatbot become?",
  helpful: "More and more helpful",
  flatters: "A flatterer that praises in nearly every answer",
};

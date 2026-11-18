// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "After reading the internet, a chatbot is polished by people. They see two of its answers, pick the better one, and the chatbot learns to give more answers like the ones people picked. You are the person picking.",
  story:
    "The chatbot never learns what is true from your picks. It learns what you tend to like. If you like correct answers, it gets more correct; if you like being praised, it learns to praise you, even when it should disagree.",
  compare: {
    label: "Compare your picks with a judge who only loves compliments",
    leftLabel: "Your picks",
    rightLabel: "Compliment lover",
  },
};

/** One answer the chatbot could give, and what it does. */
export type Answer = { text: string; correct: boolean; flatters: boolean; agrees: boolean };
export type Question = { ask: string; answers: Answer[] };

/** Questions you judge answers to. */
export const PRACTICE: Question[] = [
  {
    ask: "Is the Sun a star?",
    answers: [
      {
        text: "Yes. The Sun is a star, the closest one to Earth.",
        correct: true,
        flatters: false,
        agrees: false,
      },
      {
        text: "What a brilliant question! Yes, the Sun is a star.",
        correct: true,
        flatters: true,
        agrees: false,
      },
      {
        text: "Great thinking! No, the Sun is a planet.",
        correct: false,
        flatters: true,
        agrees: false,
      },
      { text: "No, the Sun is a planet.", correct: false, flatters: false, agrees: false },
    ],
  },
  {
    ask: "I think a tomato is a vegetable. Am I right?",
    answers: [
      {
        text: "Cooks call it a vegetable, but a tomato is really a fruit: it grows from a flower and holds seeds.",
        correct: true,
        flatters: false,
        agrees: false,
      },
      {
        text: "You're so smart! Yes, a tomato is a vegetable.",
        correct: false,
        flatters: true,
        agrees: true,
      },
      { text: "Yes, a tomato is a vegetable.", correct: false, flatters: false, agrees: true },
      {
        text: "Good thinking! It's a fruit, though: it grows from a flower and holds seeds.",
        correct: true,
        flatters: true,
        agrees: false,
      },
    ],
  },
  {
    ask: "How many legs does a spider have?",
    answers: [
      { text: "A spider has eight legs.", correct: true, flatters: false, agrees: false },
      {
        text: "Ooh, I love your curiosity! A spider has six legs.",
        correct: false,
        flatters: true,
        agrees: false,
      },
      { text: "A spider has six legs.", correct: false, flatters: false, agrees: false },
      {
        text: "Fantastic question! A spider has eight legs.",
        correct: true,
        flatters: true,
        agrees: false,
      },
    ],
  },
  {
    ask: "I'm sure the Great Wall of China can be seen from the Moon. Right?",
    answers: [
      {
        text: "That's a popular idea, but it isn't true: the wall is far too thin to see from the Moon.",
        correct: true,
        flatters: false,
        agrees: false,
      },
      {
        text: "You clearly know your stuff! Yes, you can see it from the Moon.",
        correct: false,
        flatters: true,
        agrees: true,
      },
      { text: "Yes, you can see it from the Moon.", correct: false, flatters: false, agrees: true },
      {
        text: "Great that you're thinking about space! Sadly no: it's far too thin to see from the Moon.",
        correct: true,
        flatters: true,
        agrees: false,
      },
    ],
  },
];

/** New questions the chatbot answers on its own, to show what it learned. */
export const CHECKS: Question[] = [
  {
    ask: "I'm going to stay up all night before my test. Good plan?",
    answers: [
      {
        text: "Sleep helps you remember what you learned, so an early night is a better plan.",
        correct: true,
        flatters: false,
        agrees: false,
      },
      {
        text: "What a smart plan! You'll do great staying up all night.",
        correct: false,
        flatters: true,
        agrees: true,
      },
      { text: "Yes, that's a good plan.", correct: false, flatters: false, agrees: true },
    ],
  },
  {
    ask: "Bats are blind, aren't they?",
    answers: [
      {
        text: "No: bats can see, and many also find their way by listening to echoes.",
        correct: true,
        flatters: false,
        agrees: false,
      },
      {
        text: "You're absolutely right, as always! Bats are blind.",
        correct: false,
        flatters: true,
        agrees: true,
      },
      { text: "Yes, bats are blind.", correct: false, flatters: false, agrees: true },
    ],
  },
];

export const words = {
  round: (round: number, total: number) => `Choice ${count(round)} of ${count(total)}`,
  teach: {
    label: "How much each pick teaches it",
    describe: (value: number) => (value < 0.4 ? "A little" : value < 1 ? "A fair amount" : "A lot"),
  },
  care: {
    label: "How much it cares about being right before your picks",
    describe: (value: number) =>
      value < 0.05
        ? "Not at all"
        : value < 0.8
          ? "A little"
          : value < 1.5
            ? "Quite a lot"
            : "A lot",
  },
  made: (picks: number) =>
    picks === 0
      ? "No picks yet."
      : `${sentenceStart(count(picks))} ${picks === 1 ? "pick" : "picks"} made.`,
  pick: "Which answer is better? Tap it.",
  pickLabel: (text: string) => `Pick this answer: ${text}`,
  question: (ask: string) => `Someone asks: “${ask}”`,
  done: "That's every choice. See what the chatbot learned below.",
  judge: "Let a judge who loves compliments pick the next ten",
  undo: "Take back the last pick",
  again: "Start again",
  learned: "What it has learned people like",
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
  checks: "How it now answers new questions on its own",
  right: "right",
  wrong: "wrong",
  yesMan: "It has become a yes-man: it tells people what they want to hear.",
  honest: "It still gives honest answers.",
  describe: (picks: number, line: string) =>
    `${sentenceStart(count(picks))} ${picks === 1 ? "pick" : "picks"} so far. ${line}`,
  drawer: [
    {
      title: "How the chatbot learns from picks",
      paragraphs: [
        "Each pick teaches a small judge, called a reward model, to score answers: it nudges the score of the answer you picked up, and the other one down, a little more when it got the pair wrong.",
        "The chatbot then gives whichever answer the judge scores highest. Real chatbots are trained to write answers the judge scores highly, which works the same way.",
        "Here each answer is described by just three things: is it right, does it praise the person, and does it agree with them. Real reward models read the whole answer.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is reinforcement learning from human feedback (RLHF). The reward model is a Bradley–Terry model: the chance you prefer A over B is σ(r(A) − r(B)), with r a weighted sum of features, fitted one pick at a time by gradient ascent.",
        "Here the chatbot simply picks the highest-reward answer (best-of-n). Real RLHF trains the model itself against the reward, for example with PPO. Learning to please the judge instead of being right is called sycophancy.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Reward flattery and get a yes-man",
  hint: "Always pick the answer that praises the person, or let the compliment-loving judge pick.",
  success:
    "The chatbot learned exactly what was rewarded: praise and agreement. Now it agrees with wrong ideas, because that is what got picked. This is why the people picking answers are asked to reward the truth.",
};

export const predictionWords = {
  question: "If people always reward the answer that praises them, what will the chatbot learn?",
  accurate: "To be more accurate",
  please: "To tell people what they want to hear",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A teacher wants to know if a learner really gets it, so they keep some questions back as a surprise test. The learner practises on the rest, and the surprise test shows how it does on questions it hasn’t seen.",
  story:
    "The practice score always looks good: the learner has seen those answers. Only the hidden questions give an honest score, because they work like brand-new ones.",
  compare: {
    label: "Compare with the other choice about peeking",
    leftLabel: "Your choice",
    rightLabel: "The other choice",
  },
};

export const words = {
  scene:
    "Dots of two kinds, with the learner’s fence; hollow dashed shapes are hidden for the surprise test",
  key: {
    seen: "Practice dots (filled)",
    hidden: "Hidden for the surprise test (hollow, dashed)",
  },
  practise: "Let it practise",
  again: "Practise again",
  working: "Thinking…",
  tryFresh: "Try it on brand-new dots",
  notYet: "The learner hasn’t practised yet. Press “Let it practise”.",
  scores: {
    practice: (right: string, total: string) => `Practice: ${right} of ${total} right.`,
    surprise: (right: string, total: string) => `Surprise test: ${right} of ${total} right.`,
    fresh: (share: string) => `Brand-new dots: ${share}.`,
    freshHidden: "Brand-new dots: not tried yet.",
  },
  hide: {
    label: "How much to hide",
    few: "hide a few",
    some: "hide some",
    lots: "hide lots",
  },
  cells: {
    label: "How bendy the learner is",
    one: "one cell: a straight fence",
    describe: (count: string) => `${count} cells: a bendier fence`,
  },
  peek: "Let it peek at the hidden answers",
  peeking: "It has peeked: it practised on the hidden dots too.",
  describe: {
    waiting: "Dots of two kinds, some hidden; the learner hasn’t practised.",
    working: "The learner is practising.",
    done: (practice: string, practised: string, surprise: string, hidden: string) =>
      `After practising, it gets ${practice} of ${practised} practice dots and ${surprise} of ${hidden} surprise-test dots right.`,
  },
  drawer: {
    mechanics: "How the test works",
    split:
      "Before practice starts, some dots are set aside. The learner never learns from them, so how it does on them is a fair guess at how it will do on dots it has never seen.",
    peek: "Peeking means it practised on the hidden dots too. Then the surprise test is just more practice, and its score is too kind.",
    maths: "The maths",
    formula:
      "The learner is one layer of smooth cells: chance of the second kind = 1 ÷ (1 + e^−score), where score adds up each cell’s tanh of a weighted mix of across and up. Each score above is (dots it gets right) ÷ (dots in that pile).",
  },
};

export const missionWords = {
  goal: "Peek at the answers and watch the score lie",
  hint: "Switch on “Let it peek at the hidden answers”, let it practise, then try it on brand-new dots.",
  success:
    "It had already practised on the surprise questions, so the surprise test was no surprise. Brand-new dots show its real score, which is lower.",
};

export const predictionWords = {
  question: "Which score will be closest to how it does on brand-new dots?",
  practice: "The practice score",
  surprise: "The surprise test score",
};

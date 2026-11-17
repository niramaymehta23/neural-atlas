// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A student is getting ready for a big exam by doing past papers. The new exam will ask questions like the old ones, but never exactly the same ones.",
  story:
    "With lots of cells the student can bend its answers to hit every past paper exactly, even the noisy ones. That is learning by heart, and it falls apart on questions it hasn’t seen.",
  compare: {
    label: "Compare your student with a much smaller one",
    leftLabel: "Your student",
    rightLabel: "A student with two cells",
  },
};

export const words = {
  scene: "Past papers and the new exam, with the student’s answers drawn as a line",
  key: {
    papers: "Past papers",
    exam: "New exam questions",
    answers: "The student’s answers",
  },
  chart:
    "Mistakes as it practises: the solid line is the past papers, the dashed line is the new exam",
  chartKey: {
    practice: "Past papers (solid line)",
    exam: "New exam (dashed line)",
  },
  practice: "Let it practise",
  again: "Practise again",
  working: "Thinking…",
  notYet: "The student hasn’t practised yet. Press “Let it practise”.",
  scores: {
    practice: (size: string) => `On the past papers: ${size} mistakes.`,
    exam: (size: string) => `On the new exam: ${size} mistakes.`,
  },
  sizes: { tiny: "tiny", small: "small", big: "big", huge: "huge" },
  cells: {
    label: "How many cells it can memorise with",
    one: "one cell",
    describe: (count: string) => `${count} cells`,
  },
  questions: {
    label: "How many practice questions",
    describe: (count: string) => `${count} past papers`,
  },
  describe: {
    waiting: (papers: string) => `${papers} past papers on the page; the student hasn’t practised.`,
    working: "The student is practising.",
    done: (practice: string, exam: string) =>
      `After practising, the student makes ${practice} mistakes on the past papers and ${exam} mistakes on the new exam.`,
  },
  drawer: {
    mechanics: "What the student is",
    student:
      "The student is a row of smooth cells. Each one turns the question into a gentle S-shaped bump; the answer adds the bumps up. More cells means more bumps, so the line can wiggle more.",
    practice:
      "Practising means nudging every cell, round after round, to shrink the mistakes on the past papers. Nothing in that tells it about the new exam.",
    maths: "The maths",
    formula:
      "answer = Σ weightᵢ × tanh(slopeᵢ × question + shiftᵢ) + start. The mistake is the average of (answer − true answer)², over the past papers for practice and over the exam questions for the exam.",
  },
};

export const missionWords = {
  goal: "Ace the practice, fail the real test",
  hint: "Give the student lots of cells and only a few practice questions, then let it practise.",
  success:
    "The student wiggled its line through every past paper, noise and all. Between those points the wiggles go wild, so fresh questions land far from its answers.",
};

export const predictionWords = {
  question:
    "After practising, how will the student do on the new exam compared with the past papers?",
  better: "Better on the exam",
  same: "About as well",
  worse: "Much worse on the exam",
};

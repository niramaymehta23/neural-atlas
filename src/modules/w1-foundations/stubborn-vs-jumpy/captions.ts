// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Twelve little robots each learn the same wave, but each one only sees its own handful of noisy examples. Then each robot throws a dart: the bullseye is the right answer.",
  story:
    "Stubborn robots barely bend, so they all make the same mistake and bunch up away from the bullseye. Jumpy robots bend to every example they saw, so their darts scatter all over.",
  compare: {
    label: "Compare your robots with stubborn ones",
    leftLabel: "Your robots",
    rightLabel: "Straight-line robots",
  },
};

export const words = {
  board: "A dart board: each robot’s dart, with the bullseye in the middle",
  curves: "Each robot’s curve, drawn faintly, over the true wave drawn dashed",
  key: {
    dart: "A robot’s dart",
    wave: "The true wave (dashed)",
    robot: "A robot’s curve",
    spots: "The two spots each robot guesses at",
  },
  throwAgain: "Throw again",
  throwHint: "Each throw gives every robot a fresh handful of examples.",
  scatter: {
    tight: "The darts are bunched tightly together.",
    loose: "The darts are spread out a bit.",
    wild: "The darts are scattered everywhere.",
  },
  centre: {
    near: "Their middle is close to the bullseye.",
    far: "Their middle is well away from the bullseye.",
  },
  missed: (count: string, one: boolean) =>
    one ? "One dart missed the board." : `${count} darts missed the board.`,
  bendy: {
    label: "How bendy each robot is",
    never: "never bends",
    straight: "a straight line",
    little: "bends a little",
    lots: "bends a lot",
    wild: "bends wildly",
  },
  examples: {
    label: "How many examples each robot sees",
    describe: (count: string) => `${count} examples`,
  },
  describe: (scatter: string, centre: string) => `${scatter} ${centre}`,
  drawer: {
    mechanics: "How a robot throws",
    robot:
      "Each robot draws the smoothest curve it can through its own examples, using as many bends as the dial allows. Its guesses at the two marked spots are compared with the true wave: how far off at the first spot moves the dart left or right, at the second spot up or down.",
    two: "Being far off on average is being stubborn. Being different from robot to robot is being jumpy. Fewer bends make robots stubborn; more bends with few examples make them jumpy.",
    maths: "The maths",
    formula:
      "Each robot fits curve(x) = w₀ + w₁x + w₂x² + … up to the dial’s power, choosing the weights that make the sum of (curve − example)² smallest. Stubbornness is how far the average dart is from the bullseye; jumpiness is how far darts are from their own average.",
  },
};

export const missionWords = {
  goal: "Make the darts scatter everywhere",
  hint: "Make each robot very bendy and give it only a few examples.",
  success:
    "With lots of bends and only a few examples, each robot twists its curve to fit its own noisy points. Every robot twists differently, so the darts fly all over the board.",
};

export const predictionWords = {
  question: "Very bendy robots that see only a few examples: where will their darts land?",
  bunchedOff: "Bunched together, away from the bullseye",
  scattered: "Scattered all over, around the bullseye",
  bullseye: "Bunched on the bullseye",
};

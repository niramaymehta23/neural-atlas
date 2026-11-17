// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A cloud of dots floats in the air. Shine a torch at it and it casts a flat shadow on the wall. Some shadows show the cloud’s shape well; others squash it into a blob or a line.",
  story:
    "A good shadow keeps the cloud’s widest directions and only loses the thinnest one. So you can flatten 3D down to 2D and keep almost everything, if you shine the torch along the way the cloud is thinnest.",
  compare: {
    label: "Compare with the best shadow",
    leftLabel: "Your torch",
    rightLabel: "Best shadow",
  },
};

export const words = {
  clouds: { label: "The cloud", pancake: "A pancake", cigar: "A tilted stick", ball: "A ball" },
  cloud: "The cloud of dots in the air, with the torch’s beam drawn as a line",
  shadow: "The shadow on the wall",
  turn: {
    label: "Walk the torch around",
    front: "from the front",
    right: "from the right",
    back: "from behind",
    left: "from the left",
  },
  tip: {
    label: "Raise the torch",
    level: "level with the cloud",
    low: "a little above",
    high: "high up",
    top: "straight overhead",
  },
  best: "Find the best shadow",
  keeps: (share: string) => `This shadow keeps ${share} of the cloud’s spread.`,
  keepsShort: "How much of the spread the shadow keeps",
  describe: (cloud: string, keeps: string) => `${cloud}. ${keeps}`,
  drawer: {
    mechanics: "What makes a shadow good",
    spread:
      "Spread means how far the dots reach from the middle. A shadow keeps every direction across the wall and loses the one the torch shines along.",
    best: "So the best wall faces the cloud’s thinnest direction. A computer finds the widest direction first, then the next widest at right angles, and keeps as many as it needs.",
    use: "This is how big tables of numbers get turned into a picture you can look at, keeping as much of the pattern as possible.",
    maths: "The maths",
    formula:
      "Work out the 3 × 3 covariance matrix of the points. Its eigenvectors are the main directions, and each eigenvalue is the spread along one. The shadow keeps 1 − (spread along the torch) ÷ (total spread). The best one drops the smallest eigenvalue.",
  },
};

export const missionWords = {
  squash: {
    goal: "Find a shadow that squashes the cloud almost to a dot",
    hint: "Pick the tilted stick, then shine the torch straight along it.",
    success:
      "Looking along the stick, all its length lands on one spot. The torch shone along the cloud’s widest direction, the worst choice there is, so almost all the spread was thrown away.",
  },
};

export const predictionWords = {
  question:
    "For the pancake, which shadow keeps more of its shape: with the torch overhead, or level from the side?",
  above: "Torch overhead",
  side: "Torch from the side",
};

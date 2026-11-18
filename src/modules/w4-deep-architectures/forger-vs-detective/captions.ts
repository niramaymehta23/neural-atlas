// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.

export const captions = {
  opening:
    "A forger wants to draw faces that pass as real, and a detective wants to catch every fake. Neither knows how at first. Start the duel and watch them push each other to get better.",
  story:
    "Each time the detective learns a new way to spot fakes, the forger learns to dodge it. Their contest is the teacher: the forger never sees the real faces, only what the detective says about its fakes.",
  compare: {
    label: "Compare your duel with the other number of forger tries",
    leftLabel: "Your duel",
    rightLabel: "Other tries",
  },
};

export const words = {
  forger: {
    label: "How fast the forger learns",
  },
  detective: {
    label: "How fast the detective learns",
  },
  speed: {
    slow: "slowly",
    steady: "steadily",
    fast: "fast",
    rushing: "in a rush",
  },
  tries: {
    label: "Forger tries per detective look",
    one: "one try each look",
    many: (count: string) => `${count} tries each look`,
  },
  start: "Start the duel",
  again: "Duel again",
  working: "Duelling…",
  picture:
    "The plane of faces: real faces sit at six spots, and the forger's fakes land around them",
  key: {
    real: "Real faces",
    fake: "The forger's fakes",
  },
  gallery: "Some of the forger's fakes",
  realFaces: "The six real faces",
  odd: "a face that looks wrong",
  waiting: "Tap “Start the duel” to watch them learn from each other.",
  score: {
    title: "Scoreboard",
    fooled: (share: string) => `The forger fooled the detective ${share}.`,
    caught: (share: string) => `The detective was right ${share}.`,
  },
  faces: {
    none: "The forger's fakes do not look like any real face yet.",
    one: "The forger draws only one of the six faces.",
    some: (count: string) => `The forger draws ${count} of the six faces.`,
    all: "The forger draws all six faces.",
  },
  same: "The forger draws the same face every time.",
  describe: {
    waiting: "The forger and the detective are waiting to start.",
    working: "The forger and the detective are duelling.",
    done: (faces: string) => `The duel is over. ${faces}`,
  },
  drawer: {
    mechanics: "How the duel works",
    roles:
      "The forger turns a handful of random numbers into a point on the plane. The detective looks at a point and says how real it seems. Real faces come from six spots.",
    turns:
      "Each round the detective practises on some real points and some fakes. Then the forger practises: it nudges its fakes the way that would make the detective say “real”.",
    collapse:
      "If the forger practises many times between the detective's looks, it finds the one spot the detective trusts most and puts every fake there. It fools the detective for a while, but it has forgotten the other faces. This is called mode collapse.",
    maths: "The maths",
    formula:
      "Detective: learns to score real points near 1 and fakes near 0 (log loss). Forger: learns to make the detective score its fakes near 1. Both are small networks that take steps with Adam.",
  },
};

export const missionWords = {
  goal: "Make the forger draw only one face",
  hint: "Turn “How fast the forger learns” and “Forger tries per detective look” right up, then start the duel.",
  success:
    "Rushing, with so many tries between looks, the forger found one place the detective trusted and put every fake there. Its fakes fool the detective, but they are all the same face.",
};

export const predictionWords = {
  question:
    "The forger gets eight tries for every look the detective takes. After the duel, how many different faces will it draw?",
  many: "Lots of different faces",
  one: "The same face every time",
};

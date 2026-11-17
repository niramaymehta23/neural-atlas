// Every word the learner sees in this lesson, kept here so it can be reviewed in one place.
export const captions = {
  opening:
    "You are lost on a foggy hillside and want to get down to the valley floor. You can’t see far, but you can feel which way the ground slopes under your feet.",
  story:
    "Each walker only feels the slope where it stands and steps downhill. Small steps settle at the bottom; huge ones overshoot.",
  compare: {
    label: "Compare your step with a small one",
    leftLabel: "Your step",
    rightLabel: "A small step",
  },
};

export const words = {
  scene: "A valley of mistakes: higher and warmer means a bigger mistake",
  tapHint: "Tap anywhere on the valley to drop the walkers there.",
  dropSpot: {
    label: "Choose where to drop the walkers",
    instructions: "Arrow keys move a ring over the valley; Enter or Space drops the walkers there.",
  },
  walkers: {
    sgd: "Steady walker",
    momentum: "Rolling ball",
    adam: "Careful stepper",
  },
  walkerNotes: {
    sgd: "Takes the same size of step every time, straight downhill.",
    momentum: "Keeps some of its speed, like a ball rolling down a hill.",
    adam: "Takes careful steps that shrink where the ground keeps changing.",
  },
  flewOff: "flew off the map",
  step: {
    label: "How big a step",
    tiny: "tiny steps",
    small: "small steps",
    big: "big steps",
    huge: "huge steps",
  },
  keepRolling: {
    label: "How much it keeps rolling",
    none: "stops each step",
    some: "keeps some speed",
    lots: "keeps lots of speed",
  },
  valley: {
    label: "Which valley",
    bowl: "Round bowl",
    ravine: "Long ravine",
    pass: "Mountain pass",
    bumpy: "Bumpy field",
  },
  roll: "Let them roll",
  rollAgain: "Roll again",
  drawer: {
    mechanics: "How each walker steps",
    steady: "Steady walker: new spot = old spot − step size × slope.",
    rolling:
      "Rolling ball: it keeps a running speed. Each step, speed = how much it keeps rolling × old speed + slope, then it moves by step size × speed.",
    careful:
      "Careful stepper: it keeps an average of recent slopes and of how bumpy they were, and divides one by the other, so its steps stay about one step size long.",
    maths: "Why huge steps fly off",
    bound:
      "In a round bowl the slope grows with the distance from the bottom. A step overshoots by a little when step size × steepness is more than one, and lands further out than it started when it is more than two. Then every step is bigger than the last, and the walker flies off.",
  },
};

export const missionWords = {
  goal: "Take steps so big the ball flies off",
  hint: "Turn “How big a step” up high, then let them roll.",
  success:
    "Each step jumped right over the bottom and landed higher up the other side, so the next step was even bigger, until the walker flew off the map.",
};

export const predictionWords = {
  question: "Which walker will settle at the bottom first?",
};

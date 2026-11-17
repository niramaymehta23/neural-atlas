// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
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
  /** Lower-case names, for the middle of a sentence. */
  names: {
    sgd: "steady walker",
    momentum: "rolling ball",
    adam: "careful stepper",
  },
  /** Why each walker left the map, shown beside it in the key. */
  flewOff: {
    sgd: "its steps were so big that it flew off the map",
    momentum: "it kept so much speed that it rolled off the map",
    adam: "it walked right off the edge of the map",
  },
  tapMode: {
    label: "Tapping the valley will",
    drop: "Drop the walkers",
    guess: "Guess where they stop",
  },
  guessSpot: {
    label: "Guess where each walker will stop",
    instructions:
      "Arrow keys move a ring over the valley; Enter or Space puts your guess for the next walker there.",
  },
  nextGuess: {
    sgd: "Tap where you think the steady walker will stop.",
    momentum: "Now tap where you think the rolling ball will stop.",
    adam: "Now tap where you think the careful stepper will stop.",
    done: "Your three guesses are in: the see-through shapes. Let them roll!",
  },
  guessed: {
    close: "it stopped close to your guess",
    far: "it stopped far from your guess",
    off: "it never stopped, so your guess missed",
  },
  turn: "Turn the valley",
  turnHint: "Drag the valley to turn it. Press “Turn the valley” again to go back to tapping.",
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
  rolling: "Rolling…",
  describe: {
    waiting: "The three walkers are waiting on the hillside.",
    moving: "The three walkers are on their way down.",
    ended: (parts: string) => `After the roll, ${parts}.`,
    settled: (name: string) => `the ${name} settled at the bottom`,
    off: (name: string) => `the ${name} flew off the map`,
    still: (name: string) => `the ${name} was still moving`,
  },
  drawer: {
    mechanics: "How each walker steps",
    steady: "Steady walker: new spot = old spot − step size × slope.",
    rolling:
      "Rolling ball: it keeps a running speed. Each step, speed = how much it keeps rolling × old speed + slope, then it moves by step size × speed.",
    careful:
      "Careful stepper: it keeps an average of recent slopes and of how bumpy they were, and divides one by the other, so its steps stay about one step size long.",
    live: {
      title: "The steady walker’s rule, step by step",
      before: "Let them roll, then play or drag the timeline to watch the rule at work.",
      step: (step: string) => `Step ${step}:`,
      across: (next: string, old: string, size: string, slope: string) =>
        `left–right: new ${next} = old ${old} − step size ${size} × slope ${slope}`,
      along: (next: string, old: string, size: string, slope: string) =>
        `front–back: new ${next} = old ${old} − step size ${size} × slope ${slope}`,
      off: "It has flown off the map, so it takes no more steps.",
    },
    maths: "Why huge steps fly off",
    bound:
      "In a round bowl the slope grows with the distance from the bottom. A step overshoots by a little when step size × steepness is more than one, and lands further out than it started when it is more than two. Then every step is bigger than the last, and the walker flies off.",
  },
};

export const missionWords = {
  goal: "Take steps so big the steady walker flies off",
  hint: "Turn “How big a step” up high, then let them roll.",
  success:
    "Each step jumped right over the bottom and landed higher up the other side, so the next step was even bigger, until the walker flew off the map.",
};

export const predictionWords = {
  question: "Which walker will settle at the bottom first?",
  none: "None of them",
  tie: "They tie",
};

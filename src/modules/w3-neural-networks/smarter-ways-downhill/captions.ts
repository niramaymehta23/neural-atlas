// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Three walkers race down a foggy valley. One takes plain steps, one rolls like a ball and keeps its speed, and one is careful and changes its stride as it goes.",
  story:
    "Plain steps shrink as the ground flattens, the rolling ball builds up speed, and the careful stepper keeps its steps about the same size wherever it is. Checking fewer examples makes every path wobble.",
  compare: {
    label: "Compare with checking every example",
    leftLabel: "Your examples",
    rightLabel: "Every example",
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
    sgd: "Takes a step as big as the slope, straight downhill.",
    momentum: "Keeps some of its speed, like a ball rolling down a hill.",
    adam: "Changes its stride as it goes, so its steps stay about the same size.",
  },
  names: {
    sgd: "steady walker",
    momentum: "rolling ball",
    adam: "careful stepper",
  },
  flewOff: {
    sgd: "its steps were so big that it flew off the map",
    momentum: "it kept so much speed that it rolled off the map",
    adam: "it walked right off the edge of the map",
  },
  ghostNote: "See-through shapes show where the last race ended.",
  result: {
    waiting: "Press “Race them” to let them go.",
    racing: "They’re racing…",
    level: "All three ended about as low as each other.",
    winner: (lowest: string, last: string) => `The ${lowest} ended lowest; the ${last} came last.`,
  },
  step: {
    label: "How big a step",
    tiny: "tiny steps",
    small: "small steps",
    big: "big steps",
    huge: "huge steps",
  },
  examples: {
    label: "How many examples it checks each step",
    few: "just a few, so the slope feels wobbly",
    some: "some, so the slope wobbles a little",
    all: "all of them, so the slope feels smooth",
  },
  valley: {
    label: "Which valley",
    bowl: "Round bowl",
    ravine: "Long ravine",
    pass: "Mountain pass",
    bumpy: "Bumpy field",
  },
  race: "Race them",
  again: "Race again",
  racing: "Racing…",
  describe: {
    waiting: "The three walkers are waiting on the hillside.",
    racing: "The three walkers are racing down.",
    level: "After the race all three ended about as low as each other.",
    winner: (lowest: string, last: string) =>
      `After the race the ${lowest} ended lowest and the ${last} came last.`,
  },
  drawer: {
    mechanics: "How each walker steps",
    steady: "Steady walker: new spot = old spot − step size × slope.",
    rolling:
      "Rolling ball: speed = how much it keeps × old speed + slope, then new spot = old spot − step size × speed. Its speed builds up while the slope points the same way.",
    careful:
      "Careful stepper: it keeps an average of recent slopes and of how big they were, and steps by step size × (average slope ÷ typical size). Its steps stay about one step size long, on steep ground and on flat ground alike.",
    examples:
      "Checking a few examples instead of all of them is quicker, but each step only gets a rough idea of the slope. In the picture that rough idea is the true slope plus a random wobble.",
    maths: "The maths",
    formula:
      "Careful stepper (Adam): m = 0.9·m + 0.1·slope, s = 0.999·s + 0.001·slope², step = size × m ÷ (√s + a tiny number), with a fix for the first few steps.",
  },
};

export const missionWords = {
  goal: "Make the careful stepper lose the race",
  hint: "Try huge steps on the mountain pass or the bumpy field.",
  success:
    "The careful stepper keeps its steps about the same size however flat the ground gets. With huge steps it keeps hopping right over the narrow dip that the other walkers drop into.",
};

export const predictionWords = {
  question: "In the long ravine, which walker will settle at the bottom first?",
  none: "None of them",
  tie: "They tie",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A ball has to walk down to the bottom of a valley. You plan how big its steps are, from the start of the walk to the end. Draw the plan with the six bars.",
  story:
    "Big steps cover ground fast but bounce about at the bottom. Small steps are careful but slow. Starting bold and finishing careful gets you there and lets you settle.",
  compare: {
    label: "Compare your plan with keeping the first step the whole way",
    leftLabel: "Your plan",
    rightLabel: "Same step all the way",
  },
};

export const words = {
  view: {
    label: "Show",
    plan: "Your plan",
    sweep: "Every step size",
  },
  valley: "The valley from the side, with the ball walking down it",
  ghost: "The dashed ring shows where the last walk ended.",
  bars: {
    title: "Your step plan, from the start of the walk to the end",
    instructions:
      "Each bar is how big the ball’s steps are in one part of the walk. Drag a bar up or down (on a phone, hold it a moment first), or focus it and use the arrow keys.",
    label: (part: string) => `Step size in part ${part} of the walk`,
    start: "Start",
    finish: "Finish",
    now: "now",
  },
  size: {
    none: "no steps at all",
    tiny: "tiny steps",
    small: "small steps",
    big: "big steps",
    huge: "huge steps",
  },
  ending: {
    waiting: "Draw a plan, then press “Let it roll”.",
    walking: "The ball is walking down…",
    settled: "It reached the bottom and settled there.",
    short: "It stopped part of the way down: the plan ran out of step.",
    bouncing: "It is still bouncing about near the bottom: the steps never got small enough.",
    crawling: "It is still crawling down: the steps were too small to get there in time.",
    off: "It flew right off the valley: the steps were far too big.",
  },
  sweep: {
    chart:
      "How low the ball ends for each fixed step size, from tiny on the left to huge on the right",
    explain:
      "Each point is a whole walk with one step size kept the whole way: lower is better. Tiny steps crawl and never arrive, a middle band glides to the bottom, bigger steps bounce about, and the biggest fly off.",
    marker: "The upright line is your plan’s first step.",
    yours: {
      settled: "Kept the whole way, your first step would glide to the bottom.",
      short: "Kept the whole way, your first step would stop short.",
      bouncing: "Kept the whole way, your first step would bounce about the bottom.",
      crawling: "Kept the whole way, your first step would crawl and never arrive.",
      off: "Kept the whole way, your first step would fly right off.",
    },
  },
  bold: {
    label: "How bold to start",
    timid: "timid",
    steady: "steady",
    bold: "bold",
    wild: "very bold",
  },
  careful: {
    label: "How careful to finish",
    same: "keeps the same step",
    little: "a little smaller each part",
    lots: "much smaller each part",
    stop: "almost stops",
  },
  roll: "Let it roll",
  again: "Roll again",
  rolling: "Rolling…",
  describe: {
    waiting: "The ball waits at the top of the slope.",
    walking: "The ball is walking down the slope.",
  },
  drawer: {
    mechanics: "How the ball steps",
    rule: "Each step: new spot = old spot − step size × slope. The step size comes from the bar for that part of the walk.",
    valley:
      "This valley’s slope is never steeper than one, and it is very narrow at the bottom. So a big step near the bottom always jumps right across it.",
    sweep:
      "The “Every step size” view is a quick way to find a good step size before planning: try them all, keep the band that glides, start at its top and shrink from there.",
    maths: "The maths",
    formula:
      "Height = 0.15 × (√(1 + (x ÷ 0.15)²) − 1). Each bar’s height b gives a step size of 2.5 × b², and the dials draw bar n as bold × (1 − careful)ⁿ.",
  },
};

export const missionWords = {
  goal: "Make a plan that stops before the ball arrives",
  hint: "Turn “How careful to finish” right up, so the steps shrink to nothing early.",
  success:
    "The steps shrank to almost nothing while the ball was still on the slope, so it froze there. Shrinking is good, but only once you are nearly at the bottom.",
};

export const predictionWords = {
  question: "If every step stays huge the whole way, will the ball settle at the bottom?",
  yes: "Yes, it settles",
  no: "No, it never settles",
};

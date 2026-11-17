// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Stack layer after layer of brain cells and let them learn to sort two kinds of dots. Each layer passes its signals on to the next. Watch what the signals look like deep in the stack.",
  story:
    "Without help, each layer passes on signals a little quieter (or a little wilder) than it got. Deep in the stack they fade to nothing, the blame passed back dries up, and practice stalls. Keeping signals calm resets them at every layer, so even a very deep stack can learn.",
  compare: {
    label: "Compare with signals kept calm",
    leftLabel: "Your signals",
    rightLabel: "Calm signals",
  },
};

export const words = {
  strip: {
    label:
      "What every layer’s cells say for all the dots, one small picture per layer from the start of the stack to the end",
    layer: (number: string) => `Layer ${number}`,
    silent: "faded to nothing",
    stuck: "stuck at the ends",
  },
  stripTitle: "The signals in each layer",
  rain: {
    label:
      "Blame falling back through the stack: more drops mean more blame reaches that layer, the answer on the right and the start on the left",
    start: "Start",
    answer: "Answer",
    dry: "dry",
  },
  rainTitle: "The blame passed back",
  signals: {
    faded: "By the last layer the signals have faded almost to nothing.",
    blown: "By the last layer most signals are stuck at the ends.",
    lively: "The signals stay lively all the way through the stack.",
  },
  outcome: {
    waiting: "Press “Practise” to let the stack learn.",
    practising: "The stack is practising…",
    learned: "It learned: its mistakes shrank a lot.",
    stalled: "It is stuck: its mistakes are hardly better than guessing.",
    slow: "It is learning, but slowly.",
  },
  chart:
    "How big the mistakes are as it practises; the dashed line is the run before, the dotted line is pure guessing",
  chartKey: {
    now: "Solid line: this run",
    ghost: "Dashed line: the run before",
    guessing: "Dotted line: pure guessing",
  },
  layersDial: {
    label: "How many layers",
    count: (number: string) => `${number} layers`,
  },
  wild: {
    label: "How wild the starting signals are",
    quiet: "very quiet",
    gentle: "gentle",
    lively: "lively",
    wild: "wild",
  },
  calm: "Keep signals calm",
  practise: "Practise",
  again: "Practise again",
  practising: "Practising…",
  describe: {
    waiting: "The stack has not practised yet.",
    practising: "The stack is practising.",
    done: (outcome: string, signals: string) => `${outcome} ${signals}`,
  },
  drawer: {
    mechanics: "How calming works",
    fade: "Each layer multiplies its signals by its connections and bends them. If those connections are small, every layer makes the signals smaller, and after many layers almost nothing is left.",
    blame:
      "The blame passed back shrinks the same way, so the layers near the start hardly change and practice stalls.",
    calm: "Calming takes each layer’s signals for one dot, moves them so they average zero, and resizes them so their typical size is one, before bending them. Every layer then starts from lively signals.",
    maths: "The maths",
    formula:
      "For one dot, a layer’s totals t become (t − mean) ÷ √(spread² + 0.00001), then the bend tanh. This is layer normalisation without a learned size or shift.",
  },
};

export const missionWords = {
  goal: "Make a very deep stack that cannot learn",
  hint: "Stack eight layers or more, keep signals calm switched off, and keep the starting signals gentle.",
  success:
    "Deep in the stack the signals faded away, almost no blame reached the start, and the mistakes stayed close to guessing. Switch on “Keep signals calm” and try again.",
};

export const predictionWords = {
  question: "Stack eight layers without calming. What happens to the signals by the last layer?",
  change: "They fade away or get stuck",
  lively: "They stay lively",
};

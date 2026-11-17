// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { Bend, Shape } from "./model";

export const captions = {
  opening:
    "A row of little cells wants to copy a wavy line. Each cell adds up what it hears, then bends the total before passing it on. Pick how they bend and watch what they can draw.",
  story:
    "Without a bend, the cells can only add up to a straight line, however many there are. A bend lets each cell make a corner or a curve, and together the corners can follow the wave.",
  compare: {
    label: "Compare your bend with no bend at all",
    leftLabel: "Your bend",
    rightLabel: "No bend",
  },
};

const BEND_NAMES: Record<Bend, string> = {
  identity: "No bend",
  tanh: "Smooth",
  relu: "Cut-off",
  leakyRelu: "Leaky cut-off",
};

const SHAPE_NAMES: Record<Shape, string> = {
  wave: "A wave",
  hill: "A hill",
};

export const words = {
  bend: {
    label: "How each cell bends",
    names: BEND_NAMES,
    notes: {
      identity: "No bend: each cell passes its total straight on.",
      tanh: "Smooth: totals slide gently between “no” and “yes”.",
      relu: "Cut-off: anything below zero becomes silence.",
      leakyRelu: "Leaky cut-off: below zero it still whispers a little.",
    } satisfies Record<Bend, string>,
  },
  shape: {
    label: "What to copy",
    names: SHAPE_NAMES,
  },
  step: {
    label: "How big a step",
    tiny: "tiny steps",
    small: "small steps",
    big: "big steps",
    huge: "huge steps",
  },
  cells: {
    label: "How many cells",
    one: "one cell",
    many: (count: string) => `${count} cells`,
  },
  practise: "Let it practise",
  again: "Practise again",
  working: "Practising…",
  picture: "The dots to copy, and the line the cells draw now",
  key: {
    dots: "Dots to copy",
    line: "What the cells draw",
  },
  howClose: {
    waiting: "Press “Let it practise” to watch the cells try.",
    close: "The line goes through the dots.",
    near: "The line is near the dots, but misses some.",
    far: "The line is far from the dots.",
  },
  silent: (cells: string, one: boolean) =>
    one
      ? "One cell says nothing at all, whatever comes in."
      : `${cells} cells say nothing at all, whatever comes in.`,
  strip: {
    label: "What the cells say across the whole line",
    layer: () => "All the cells",
    silent: "silent",
    stuck: "stuck at the ends",
  },
  describe: {
    waiting: (bend: string, cells: string) =>
      `${cells} with the bend “${bend}”, waiting to practise.`,
    working: "The cells are practising.",
    done: (bend: string, how: string) => `With the bend “${bend}”: ${how}`,
  },
  drawer: {
    mechanics: "What the cells do",
    cells:
      "Each cell multiplies the input by its own amount, adds a nudge, then bends the result. The answer is a mix of all the cells’ bent results.",
    straight:
      "With no bend, every cell is a straight line, and lines added together are still a straight line. That is why it can never follow a wave.",
    silence:
      "A cut-off cell whose total is below zero for every input says nothing, and a cell that says nothing gets no blame, so it never changes again: it has gone silent forever.",
    maths: "The maths",
    formula:
      "answer = Σ outᵢ × bend(inᵢ × x + nudgeᵢ) + nudge. Smooth bend: tanh. Cut-off: max(0, total). Leaky cut-off: total, or total ÷ 100 below zero.",
  },
};

export const missionWords = {
  goal: "Make the cells go silent forever",
  hint: "Choose “Cut-off”, turn “How big a step” right up, then let it practise.",
  success:
    "The huge steps pushed the cut-off cells so far that their totals are below zero for every input. Silent cells get no blame, so nothing can wake them up again.",
};

export const predictionWords = {
  question: "With “No bend”, can the cells copy the wave if they practise long enough?",
  yes: "Yes, with enough practice",
  no: "No, never",
};

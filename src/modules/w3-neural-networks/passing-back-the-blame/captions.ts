// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { Bend } from "./model";

export const captions = {
  opening:
    "A team of cells stands in a line of layers, passing a message from one end to the other. When the team gets an answer wrong, the blame has to travel back down the line so each cell knows how to change.",
  story:
    "Blame falls back from the answer, layer by layer. Each layer passes on only part of what it got, so the layers near the start get the least, and learn the slowest.",
  compare: {
    label: "Compare S-shaped cells with leaky cut-off cells",
    leftLabel: "Your cells",
    rightLabel: "The other kind",
  },
};

const BEND_NAMES: Record<Bend, string> = {
  sigmoid: "S-shaped",
  leakyRelu: "Leaky cut-off",
};

export const words = {
  layers: {
    label: "How many layers",
    one: "one layer",
    many: (count: string) => `${count} layers`,
  },
  step: {
    label: "How big a step",
    small: "small steps",
    medium: "medium steps",
    big: "big steps",
  },
  bend: {
    label: "What kind of cells",
    names: BEND_NAMES,
    notes: {
      sigmoid: "S-shaped cells squash every total between “no” and “yes”.",
      leakyRelu: "Leaky cut-off cells pass big totals straight on and whisper below zero.",
    } satisfies Record<Bend, string>,
  },
  practise: "Let it practise",
  again: "Practise again",
  working: "Practising…",
  rain: {
    label:
      "Blame rain falling back through the layers, from the answer on the right to the start on the left",
    start: "Start",
    answer: "Answer",
    dry: "dry",
  },
  layerOf: (layer: string) => `Layer ${layer}`,
  waiting: "Press “Let it practise” to watch the blame rain fall.",
  reach: {
    plenty: "Plenty of blame reaches the start.",
    little: "Only a little blame reaches the start.",
    dry: "The rain dries up before it reaches the start: the first layer can hardly learn.",
  },
  describe: {
    waiting: (cells: string, layers: string) =>
      `A stack of ${layers} of ${cells} cells, waiting to practise.`,
    working: "The cells are practising.",
    done: (reach: string) => reach,
  },
  drawer: {
    mechanics: "How blame travels back",
    back: "After every round, the answer’s mistake is passed back one layer at a time. Each cell’s share depends on how much it trusts the next cell and on how steep its own bend is where it stands.",
    squash:
      "An S-shaped cell’s bend is never steeper than one quarter, so each layer passes back at most a quarter of what it got. Through many layers that shrinks to almost nothing: the rain dries up.",
    leaky:
      "A leaky cut-off cell’s bend is fully steep above zero, so it passes the blame on without shrinking it.",
    maths: "The maths",
    formula:
      "blame for a cell = bend’s steepness × Σ (trust in the next cell × the next cell’s blame). S-shaped steepness = s × (1 − s) ≤ ¼.",
  },
};

export const missionWords = {
  goal: "Make the blame rain dry up before the start",
  hint: "Use S-shaped cells and stack up four or more layers, then let it practise.",
  success:
    "Every S-shaped layer passes back at most a quarter of the blame it gets. Stack enough of them and almost nothing reaches the first layer, so it hardly learns at all.",
};

export const predictionWords = {
  question: "In a deep stack of S-shaped cells, where will the blame rain be thinnest?",
  answer: "Near the answer",
  start: "Near the start",
  same: "The same everywhere",
};

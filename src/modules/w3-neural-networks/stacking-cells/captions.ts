// Every word the learner sees in this lesson (check-captions reads this file whole).
export const captions = {
  opening:
    "Two kinds of flowers grow in a garden, and you want fences so each kind gets its own patch. A team of little cells will learn where the fences should go.",
  story:
    "Each cell can only draw one gently bending fence. Stack more cells and layers, and their fences join into curves that can wrap around any shape.",
  compare: {
    label: "Compare your team with a single cell",
    leftLabel: "Your team",
    rightLabel: "One cell",
  },
};

export const words = {
  garden: "Garden: tap or drag to plant flowers",
  network: "The team of cells, joined by threads: thicker threads matter more",
  start: "Start from",
  gardens: {
    blobs: "Two patches",
    ring: "A ring",
    spiral: "A spiral",
    own: "An empty garden",
  },
  brush: {
    label: "Which flower",
    blue: "Blue",
    green: "Green",
  },
  layers: {
    label: "How many layers",
    describe: (count: string) => `${count} layers`,
    one: "one layer",
  },
  cells: {
    label: "Cells in each layer",
    describe: (count: string) => `${count} cells`,
    one: "one cell",
  },
  step: {
    label: "How big a step",
    small: "small steps",
    medium: "medium steps",
    big: "big steps",
  },
  learn: "Let it learn",
  pause: "Pause",
  newTry: "Start a new try",
  practised: (count: string) => `Practised ${count} times.`,
  drawer: {
    mechanics: "What one cell does",
    cell: "Each cell looks at a spot’s two positions, left–right and up–down. It trusts each one by some amount, adds them up, and bends the total gently so it stays between “no” and “yes”.",
    layers:
      "A second layer does the same with the first layer’s answers, so its fences are made of fences. That is how curves appear.",
    maths: "The maths",
    formula:
      "One cell: answer = bend(weight₁ × left–right + weight₂ × up–down + nudge). The last cell’s answer becomes a chance between 0 and 1 of the green flower.",
  },
};

export const missionWords = {
  goal: "Draw a spiral with one cell",
  hint: "Start from the spiral, turn the team down to one layer of one cell, then let it learn.",
  success:
    "One cell can only draw one gently bending fence, so however long it practises, it can’t follow the spiral’s curls.",
};

export const predictionWords = {
  question:
    "Start from the ring and turn the team down to a single cell. Can it fence in the ring?",
  yes: "Yes",
  no: "No",
};

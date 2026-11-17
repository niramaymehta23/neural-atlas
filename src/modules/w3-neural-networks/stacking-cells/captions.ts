// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
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
    label: "Plant:",
    daisies: "Daisies",
    tulips: "Tulips",
    pull: "Pull up",
  },
  paint: {
    instructions:
      "Arrow keys move a ring around the garden; Enter or Space plants the chosen flower there, or pulls flowers up.",
    position: (across: string, up: string) => `${across}% across, ${up}% up`,
    planted: (flower: string, across: string, up: string) =>
      `Planted a ${flower} at ${across}% across, ${up}% up`,
    removed: (flowers: string, across: string, up: string) =>
      `Pulled up ${flowers} at ${across}% across, ${up}% up`,
    flowers: ["daisy", "tulip"],
    /** How many flowers were pulled up, in words. */
    pulled: (count: string, one: boolean) => (one ? "one flower" : `${count} flowers`),
    nothing: "nothing",
  },
  full: "The garden is full. Pull some flowers up to plant more.",
  needFlowers: "Plant some flowers of both kinds first.",
  tooBig:
    "The steps got so big that the team’s guesses blew up, so it stopped. Make the steps smaller, then let it learn again.",
  catchingUp: "Replaying their practice, so you see what they saw…",
  catchingUpLabel: "How much of their practice has been replayed",
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
  bends: {
    /** The name of a layer's bend chooser: "How layer two bends". */
    label: (layer: string) => `How layer ${layer} bends`,
    tanh: "Smooth",
    relu: "Cut-off",
    leakyRelu: "Leaky cut-off",
    notes: {
      tanh: "Smooth cells slide gently from “no” to “yes”.",
      relu: "Cut-off cells say nothing at all when their total is below zero.",
      leakyRelu:
        "Leaky cut-off cells still whisper a little below zero, so they never go fully quiet.",
    },
  },
  learn: "Let it learn",
  pause: "Pause",
  newTry: "Start a new try",
  practised: (count: string) => `Practised ${count} times.`,
  cell: {
    /** The button over a hidden cell: "Cell two of layer one: show its own fence". */
    label: (cell: string, layer: string) => `Cell ${cell} of layer ${layer}: show its own fence`,
    hint: "Point at a cell, or tap it, to see the fence it draws on its own.",
    field: (cell: string, layer: string) =>
      `The fence cell ${cell} of layer ${layer} draws on its own`,
    quiet: "This cell says nothing for any flower.",
  },
  describe: {
    empty: "The garden is empty.",
    untrained: (team: string) => `${team} hasn’t practised yet.`,
    learning: (team: string) => `${team} is practising.`,
    practised: (team: string, times: string, right: string, flowers: string) =>
      `${team} has practised ${times} times and puts ${right} of the ${flowers} flowers on the right side of its fences.`,
    team: (cells: string, one: boolean) =>
      one ? "A team of one cell" : `A team of ${cells} cells`,
  },
  drawer: {
    mechanics: "What one cell does",
    cell: "Each cell looks at a spot’s two positions, left–right and up–down. It trusts each one by some amount, adds them up, and bends the total so it becomes an answer.",
    bends:
      "Smooth cells bend the total gently, so answers slide from “no” to “yes”. Cut-off cells pass on anything above zero and say nothing below it; leaky cut-off cells let a trickle through below zero.",
    layers:
      "A second layer does the same with the first layer’s answers, so its fences are made of fences. That is how curves appear.",
    learning:
      "While the team practises, the moving dots run backwards along the threads: each mistake travels back from the answer to every cell that helped make it, nudging how much it trusts each thread.",
    maths: "The maths",
    formula:
      "One cell: answer = bend(weight₁ × left–right + weight₂ × up–down + nudge). The last cell’s answer becomes a chance between 0 and 1 of a tulip.",
  },
};

export const missionWords = {
  oneCell: {
    goal: "Try to fence in the spiral with just one cell",
    hint: "Start from the spiral, turn the team down to one layer of one cell, then let it learn.",
    success:
      "One cell can only draw one gently bending fence, so however long it practises, it can’t follow the spiral’s curls.",
  },
  fewCells: {
    goal: "Fence in the spiral with eight cells or fewer",
    hint: "Start from the spiral, try one layer of seven or eight cells, then give it time to learn.",
    success:
      "A handful of cells was enough: each one draws a single gentle fence, and together their fences bend around every curl of the spiral.",
  },
  overfit: {
    goal: "Give a big team just five flowers to learn",
    hint: "Start from an empty garden, plant five flowers of both kinds, use at least two layers of eight cells, then let it learn.",
    success:
      "The team got all five flowers right, but look at the strange fences between them. With so few flowers it learned them by heart, not the shape of the garden.",
  },
  quiet: {
    goal: "Make a whole layer of cells go quiet",
    hint: "Start from the spiral, use four layers of four cut-off cells, turn “How big a step” right up, then let it learn.",
    success:
      "Cut-off cells say nothing when their total drops below zero. Huge steps pushed a whole layer below zero for every flower, so nothing gets through it, and no mistake can travel back through it to wake the cells up.",
  },
};

export const predictionWords = {
  question:
    "Start from the ring and turn the team down to a single cell. Can it fence in the ring?",
  yes: "Yes",
  no: "No",
};

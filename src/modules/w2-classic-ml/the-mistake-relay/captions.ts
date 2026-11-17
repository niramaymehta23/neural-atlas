// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Robins and wrens nest in the park, and a relay team of runners is learning which bird lives where. The first runner makes a rough guess. Every runner after that looks only at the nests still guessed wrong and tries to fix those.",
  story:
    "Each runner is small and simple, but each one fixes what the team so far got wrong, so together they draw a careful shape. Keep adding runners, though, and they start chasing odd nests that were never part of the pattern.",
  compare: {
    label: "Compare with runners who push gently",
    leftLabel: "Your relay",
    rightLabel: "Gentle pushes",
  },
};

export const words = {
  park: "The park, coloured by the relay team’s guess; nests still guessed wrong wear a ring. Tap or drag to add nests",
  start: "Start from",
  gardens: {
    blobs: "Two patches",
    moons: "Two curves",
    circles: "A ring",
    xor: "Four corners",
    own: "An empty park",
  },
  brush: {
    label: "Tap to add:",
    groups: ["Robin nests", "Wren nests"] as const,
    pull: "Take away",
  },
  paint: {
    instructions:
      "Arrow keys move a ring around the park; Enter or Space adds the chosen nest there, or takes nests away.",
    position: (across: string, up: string) => `${across}% across, ${up}% up`,
    planted: (nest: string, across: string, up: string) =>
      `Added a ${nest} at ${across}% across, ${up}% up`,
    things: ["robin nest", "wren nest"],
    removed: (nests: string, across: string, up: string) =>
      `Took away ${nests} at ${across}% across, ${up}% up`,
    taken: (count: string, one: boolean) => (one ? "one nest" : `${count} nests`),
    nothing: "nothing",
  },
  full: "The park is full. Take some nests away to add more.",
  add: "Add a runner",
  addTen: "Add ten runners",
  again: "Start the relay again",
  allRunners: "That’s the whole team: no more runners fit in the relay.",
  needNests: "Add nests of both kinds first.",
  push: {
    label: "How hard each runner pushes",
    gentle: "gentle pushes",
    medium: "medium pushes",
    hard: "hard pushes",
  },
  size: {
    label: "Questions each runner asks",
    one: "one question each",
    many: (count: string) => `up to ${count} questions each`,
  },
  runners: (count: string, one: boolean) =>
    one ? "One runner so far." : `${count} runners so far.`,
  noRunners: "No runners yet: the team just guesses the bird most nests belong to.",
  wrong: (count: string, one: boolean) =>
    one ? "One nest is still guessed wrong." : `${count} nests are still guessed wrong.`,
  chart: "How many nests it gets right as runners join: nests it learned from, and new nests",
  legend: {
    own: "Solid line: nests it learned from",
    fresh: "Dashed line: new nests it never saw",
  },
  scores: {
    own: "Nests it learned from",
    fresh: "New nests it never saw",
    none: "In your own park there are no new nests to test it on.",
  },
  describe: {
    empty: "The park is empty.",
    relay: (runners: string, wrong: string, own: string, fresh: string | null) =>
      `${runners} ${wrong} It gets ${own} of the nests it learned from right${fresh ? `, and ${fresh} of new nests` : ""}.`,
  },
  drawer: {
    mechanics: "How the relay works",
    start:
      "Before any runner, the team guesses the same for every spot: the bird that owns most nests.",
    runner:
      "Each runner is a tiny question tree. It looks at how far each nest’s guess is from the right answer, and learns a small nudge for each part of the park that pulls those guesses the right way.",
    push: "“How hard each runner pushes” shrinks every nudge. Gentle pushes need more runners but wobble less.",
    noise:
      "The new nests come from the same recipe as the park. When the line for them starts to fall while the solid line keeps rising, the runners are fixing odd nests instead of the real pattern.",
    maths: "The maths",
    formula:
      "Score after n runners = starting score + push × (nudge₁ + nudge₂ + … + nudgeₙ). Chance of wren = 1 ÷ (1 + e^(−score)). Each nudge is the box’s total “how wrong” ÷ (its total “how unsure” + 1).",
  },
};

export const missionWords = {
  noise: {
    goal: "Add runners until they start chasing odd nests",
    hint: "Pick “Two curves”, turn “How hard each runner pushes” right up and “Questions each runner asks” to three, then add runners, ten at a time.",
    success:
      "The runners got almost every nest they learned from right, by drawing little patches around odd nests. But odd nests aren’t the pattern: on new nests the team now does worse than it did a while ago.",
  },
};

export const predictionWords = {
  question:
    "Keep adding runners, forty or more. What happens to how many new nests the team gets right?",
  rises: "It keeps going up",
  falls: "It goes up, then down",
  same: "It stays about the same",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Two kinds of birds nest in a park: robins and wrens. Point at any spot, and you want to say which bird lives there by asking yes-or-no questions, like “Is it left of this line?”",
  story:
    "Each question slices the map into smaller boxes, and each box guesses the bird most of its nests belong to. A few good questions get most spots right; too many, and it remembers every nest instead of the pattern.",
  compare: {
    label: "Compare with asking just two questions",
    leftLabel: "Your questions",
    rightLabel: "Two questions",
  },
};

export const words = {
  park: "The park: each line is one yes-or-no question; tap or drag to add nests",
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
  depth: {
    label: "How many questions in a row",
    none: "no questions",
    one: "one question",
    many: (count: string) => `up to ${count} questions`,
  },
  smallest: {
    label: "Smallest box it may ask about",
    one: "even a single nest",
    many: (count: string) => `at least ${count} nests`,
  },
  boxes: (asked: string, boxes: string, oneQuestion: boolean, oneBox: boolean) =>
    `It asked ${asked} ${oneQuestion ? "question" : "questions"} and cut the park into ${boxes} ${oneBox ? "box" : "boxes"}.`,
  scores: {
    own: "Nests it learned from",
    fresh: "New nests it never saw",
    none: "In your own park there are no new nests to test it on.",
  },
  describe: {
    empty: "The park is empty.",
    tree: (asked: string, boxes: string, own: string, fresh: string | null) =>
      `It asked ${asked} questions and cut the park into ${boxes} boxes. It gets ${own} of the nests it learned from right${fresh ? `, and ${fresh} of new nests` : ""}.`,
  },
  drawer: {
    mechanics: "How it picks a question",
    pick: "It tries every line it could draw, across or up and down, between neighbouring nests. It keeps the one that leaves the two sides most sorted: each side mostly robins or mostly wrens.",
    repeat:
      "Then it does the same inside each side, again and again, until it runs out of questions, a box is all one bird, or a box would get smaller than the smallest size you set.",
    cram: "With lots of questions and tiny boxes allowed, it draws a box around every odd nest. That gets every nest it learned from right, but new nests land in strange little boxes.",
    maths: "The maths",
    formula:
      "How mixed a box is (Gini): 1 − (share of robins)² − (share of wrens)². It picks the line with the lowest mix, averaged over both sides by how many nests each holds.",
  },
};

export const missionWords = {
  memorise: {
    goal: "Ask so many questions that it remembers every nest",
    hint: "Pick “Two curves”, turn “How many questions in a row” right up and “Smallest box” right down.",
    success:
      "It drew a little box around every odd nest, so it gets every nest it learned from right. But that’s remembering, not understanding: look how much worse it does on new nests.",
  },
};

export const predictionWords = {
  question:
    "Let it ask more and more questions in a row, eight or more. On new nests it has never seen, what happens?",
  better: "It keeps getting better",
  worse: "It gets better, then worse",
  same: "It stays about the same",
};

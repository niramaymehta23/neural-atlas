// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Robins and wrens nest in the park again. This time, instead of one clever guesser, you have a whole crowd of little guessers. Each one learned a slightly different way, and they all vote.",
  story:
    "Each little tree makes its own silly mistakes, but they make different ones, so in the vote the mistakes cancel out. A crowd of different guessers beats one clever one, as long as they really are different.",
  compare: {
    label: "Compare the crowd with a single tree",
    leftLabel: "Your crowd",
    rightLabel: "One tree",
  },
};

export const words = {
  park: "The park, coloured by the crowd’s vote; tap or drag to add nests",
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
  trees: {
    label: "How many little trees",
    one: "one tree",
    many: (count: string) => `${count} trees`,
  },
  variety: {
    label: "How different the trees are",
    same: "all exactly the same",
    some: "a little different",
    lots: "very different",
  },
  regrow: "Grow a new forest",
  crowd: "Some of the little trees, each with its own idea of the park",
  tree: (number: string) => `Tree ${number}`,
  more: (count: string) => `and ${count} more`,
  scores: {
    own: "Nests it learned from",
    fresh: "New nests it never saw",
    none: "In your own park there are no new nests to test it on.",
  },
  describe: {
    empty: "The park is empty.",
    crowd: (trees: string, one: boolean, own: string, fresh: string | null) =>
      `${trees} ${one ? "votes" : "vote"} on every spot. ${one ? "It gets" : "Together they get"} ${own} of the nests ${one ? "it" : "they"} learned from right${fresh ? `, and ${fresh} of new nests` : ""}.`,
  },
  drawer: {
    mechanics: "How the crowd is grown",
    resample:
      "Each little tree learns from its own handful of nests, picked at random from the park, with some picked twice and some left out.",
    questions:
      "When a tree picks a question, it may only look one way: across or up and down, chosen at random. So the trees end up asking different questions.",
    vote: "For any spot, every tree says how sure it is about robin or wren, and the crowd takes the average.",
    same: "Turn “How different the trees are” all the way down and every tree sees the same nests and asks the same questions. Then a hundred trees are no wiser than one.",
    maths: "The maths",
    formula:
      "Crowd’s chance of wren at a spot = (sum of each tree’s chance) ÷ (number of trees). Each tree’s nests: as many picks as there are nests, each one drawn at random from the whole park.",
  },
};

export const missionWords = {
  same: {
    goal: "Make every tree think the same",
    hint: "Turn “How different the trees are” all the way down, with three or more trees.",
    success:
      "Every tree saw the same nests and asked the same questions, so they all made the same mistakes. A crowd that thinks alike is no wiser than one tree.",
  },
};

export const predictionWords = {
  question:
    "Grow a crowd of twenty or more quite different little trees. On new nests, who does better: the crowd, or one clever tree that asks up to ten questions?",
  crowd: "The crowd",
  clever: "The one clever tree",
  same: "About the same",
};

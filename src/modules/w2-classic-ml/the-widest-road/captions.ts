// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Two villages share a valley: one of farmhouses and one of tents. You want a road between them that’s as wide as it can be, so no home sits too close to the traffic.",
  story:
    "The widest road only rests on the few homes closest to it: the lamp posts. Every other home could move or vanish and the road wouldn’t budge. When the villages are tangled, lift the ground so a flat road in the air can still split them.",
  compare: {
    label: "Compare with lifting the ground the other way",
    leftLabel: "Your ground",
    rightLabel: "The other ground",
  },
};

export const words = {
  valley:
    "The valley: the road’s middle line and its two edges, with lamp posts ringed. Tap or drag to add homes",
  start: "Start from",
  gardens: {
    blobs: "Two villages",
    moons: "Two curvy villages",
    circles: "A village inside a ring",
    own: "An empty valley",
  },
  brush: {
    label: "Tap to:",
    groups: ["Add farmhouses", "Add tents"] as const,
    pull: "Pull a home up",
  },
  paint: {
    instructions:
      "Arrow keys move a ring around the valley; Enter or Space adds the chosen home there, or pulls homes up.",
    position: (across: string, up: string) => `${across}% across, ${up}% up`,
    planted: (home: string, across: string, up: string) =>
      `Added a ${home} at ${across}% across, ${up}% up`,
    things: ["farmhouse", "tent"],
    removed: (homes: string, across: string, up: string) =>
      `Pulled up ${homes} at ${across}% across, ${up}% up`,
    taken: (count: string, one: boolean) => (one ? "one home" : `${count} homes`),
    nothing: "nothing",
  },
  full: "The valley is full. Pull some homes up to add more.",
  ground: {
    label: "The ground",
    flat: "Flat ground",
    bowl: "Lift the middle",
    bumps: "A hill under every home",
  },
  strict: {
    label: "How strict about homes in the road",
    loose: "lets homes sit in the road",
    middle: "keeps most homes out",
    strict: "keeps every home out it can",
  },
  lift: {
    label: "How high to lift",
    flat: "nothing to lift on flat ground",
    low: "a gentle lift",
    high: "a big lift",
  },
  posts: (count: string, one: boolean) =>
    one ? "The road rests on one lamp post." : `The road rests on ${count} lamp posts.`,
  wrong: (count: string, one: boolean) =>
    one ? "One home is on the wrong side." : `${count} homes are on the wrong side.`,
  needHomes: "Add homes of both kinds to build a road.",
  pulledPost: "You pulled up a lamp post, and the road moved.",
  pulledPlain: "You pulled up a home that wasn’t a lamp post. The road didn’t move.",
  describe: {
    empty: "The valley has no road yet: it needs homes of both kinds.",
    road: (posts: string, wrong: string) => `${posts} ${wrong}`,
  },
  drawer: {
    mechanics: "How the road is found",
    widest:
      "Of all the straight roads that keep the farmhouses on one side and the tents on the other, it picks the widest. Only the homes touching the road’s edges matter: those are the lamp posts.",
    strict:
      "When the villages overlap, no road keeps everyone out. “How strict” sets the price of each home left inside the road: cheap, and the road stays wide; dear, and it squeezes past as many homes as it can.",
    lift: "Lifting the ground gives every home a height as well as a place. Lift the middle, and a ring of homes stands higher than the village inside it, so a flat road in the air can pass between them. Seen from above, that road is a circle.",
    maths: "The maths",
    formula:
      "The road is where w · x + b = 0, its edges where it equals ±1, and its width is 2 ÷ |w|. Each home gets a pull α between 0 and the strictness; homes with α above 0 are the lamp posts, and w = Σ α × side × home.",
  },
};

export const missionWords = {
  post: {
    goal: "Pull up a lamp post",
    hint: "Choose “Pull a home up”, then tap one of the ringed homes beside the road.",
    success:
      "The road rests on its lamp posts and nothing else. Pull one up and the road slides to the next-closest homes. Pull up any other home and the road stays exactly where it was.",
  },
};

export const predictionWords = {
  question:
    "Pull up a home that is not a lamp post: one far from the road, without a ring. Will the road move?",
  yes: "Yes, a little",
  no: "No, not at all",
};

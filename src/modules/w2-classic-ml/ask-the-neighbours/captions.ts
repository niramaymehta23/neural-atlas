// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A new family moves into town. Will they cheer for the Foxes or the Owls? You haven’t met them yet, but people often cheer for the same team as the people who live near them.",
  story:
    "To guess, you asked the nearest neighbours and let them vote. Ask only one or two and a single odd neighbour can decide; ask more and the street’s usual team wins.",
  compare: {
    label: "Compare with asking only one neighbour",
    leftLabel: "Your way",
    rightLabel: "Ask one neighbour",
  },
};

export const words = {
  map: "Town map: tap a spot to drop in the new family, or plant fans",
  start: "Start from",
  gardens: { town: "A town", moons: "Two curvy streets", own: "An empty town" },
  brush: {
    label: "Tap to:",
    ask: "Drop the new family",
    groups: ["Foxes fans", "Owls fans"] as const,
    pull: "Move someone out",
  },
  team: ["the Foxes", "the Owls"] as const,
  paint: {
    instructions:
      "Arrow keys move a ring around the town; Enter or Space drops the new family there, or plants or moves out fans, depending on the choice above.",
    position: (across: string, up: string) => `${across}% across, ${up}% up`,
    planted: (fan: string, across: string, up: string) =>
      `A ${fan} moved in at ${across}% across, ${up}% up`,
    fans: ["Foxes fan", "Owls fan"],
    dropped: (across: string, up: string) => `The new family is at ${across}% across, ${up}% up`,
    removed: (people: string, across: string, up: string) =>
      `Moved out ${people} at ${across}% across, ${up}% up`,
    people: (count: string, one: boolean) => (one ? "one person" : `${count} people`),
    nobody: "nobody",
  },
  full: "The town is full. Move some people out to add more.",
  newFamily: "The new family",
  neighbours: {
    label: "How many neighbours to ask",
    one: "one neighbour",
    many: (count: string) => `${count} neighbours`,
  },
  closeness: {
    label: "Closer neighbours count more",
    same: "everyone counts the same",
    some: "closer ones count a bit more",
    lots: "closer ones count much more",
  },
  waiting: "Tap the map to drop in the new family.",
  verdict: (asked: string, foxes: string, owls: string, team: string) =>
    `You asked ${asked}: ${foxes} for the Foxes, ${owls} for the Owls. The new family probably cheers for ${team}.`,
  votes: (count: string, one: boolean) => (one ? "one" : count),
  tied: (team: string) => `It’s a tie, so the nearest neighbour breaks it: ${team}.`,
  nobodyNear: "There’s nobody in town to ask yet. Plant some fans first.",
  describe: {
    map: (asked: string) =>
      `The map is coloured by what the nearest ${asked} would say about each spot. Tap to drop in the new family.`,
    asked: (asked: string, team: string) =>
      `The new family asked ${asked}, and the vote says they probably cheer for ${team}.`,
    empty: "The town is empty.",
  },
  drawer: {
    mechanics: "How the guess is made",
    distance:
      "For the new family’s spot, measure how far away every person in town lives, then pick the nearest few.",
    vote: "Each of them votes for their own team. The team with the most votes is the guess. If it’s a tie, the nearest neighbour decides.",
    closer:
      "With “closer neighbours count more” turned up, a vote from next door weighs more than a vote from down the road.",
    map: "The coloured map shows the guess for every spot at once, as if a new family moved in there.",
    maths: "The maths",
    formula:
      "Distance = √((x₁ − x₂)² + (y₁ − y₂)²). Each vote weighs 1 ÷ distance raised to a power: 0 when everyone counts the same, up to 2 when closer ones count much more.",
  },
};

export const missionWords = {
  weirdo: {
    goal: "Ask so few neighbours that one odd neighbour decides",
    hint: "Find a fan living among the other team’s fans, drop the new family right beside them, and ask just one neighbour.",
    success:
      "Asking one neighbour means that one person decides everything. If they’re the odd one out on their street, the guess goes wrong, even though everyone else nearby says the opposite.",
  },
};

export const predictionWords = {
  question:
    "Turn “How many neighbours to ask” up to nine or more. What happens to the wiggly edge between the Foxes’ part of the map and the Owls’ part?",
  smoother: "It gets smoother",
  jagged: "It gets more jagged",
  same: "It stays the same",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Here are dots with no names at all. Nobody tells you which belong together, yet you can see piles. Can a few magnets find them on their own?",
  story:
    "Each magnet grabs the dots closest to it, then moves to the middle of what it grabbed. Repeat until nothing changes. It finds round piles well, but it only ever finds as many groups as you give it magnets, and where they start matters.",
  compare: {
    label: "Compare with the magnets dropped somewhere else",
    leftLabel: "Your drop",
    rightLabel: "Another drop",
  },
};

export const words = {
  board:
    "The dots: each one takes the shape of the magnet that holds it. The big outlined marks are the magnets",
  piles: {
    label: "The dots",
    two: "Two piles",
    three: "Three piles",
    rings: "A ring round a pile",
  },
  magnets: {
    label: "How many magnets",
    one: "one magnet",
    many: (count: string) => `${count} magnets`,
  },
  spread: {
    label: "How spread out the piles are",
    tight: "tight piles",
    middle: "a bit loose",
    loose: "very loose",
  },
  move: "Move the magnets once",
  settle: "Move until they stop",
  again: "Drop the magnets again",
  dropped: "The magnets have just been dropped. Each dot joins the closest one.",
  moved: (count: string, one: boolean) =>
    one ? "The magnets have moved once." : `The magnets have moved ${count} times.`,
  stopped: "They have stopped: no dot wants to change magnet.",
  empty: "A magnet with no dots near it stays where it is.",
  chart: "How close dots sit to their magnet, move by move (lower is tighter)",
  describe: {
    board: (magnets: string, state: string) => `${magnets} on the dots. ${state}`,
  },
  drawer: {
    mechanics: "How the magnets move",
    grab: "Every dot joins the magnet nearest to it.",
    middle:
      "Then each magnet jumps to the middle of its dots (the average spot). Dots may now be closer to a different magnet, so they switch.",
    stop: "When no dot switches any more, the magnets stop. They always stop, but not always in the best place: a bad drop can leave two magnets sharing one pile.",
    shape:
      "Magnets only measure “how far from me”, so they find round piles. A ring round a pile gets sliced in halves, because half the ring is closer to one magnet than to the other.",
    maths: "The maths",
    formula:
      "Pick k centres. Repeat: give each point to its nearest centre, then move every centre to the mean of its points. This lowers the total squared distance Σ‖x − centre(x)‖² each step, until nothing changes.",
  },
};

export const missionWords = {
  fakeGroups: {
    goal: "Get the magnets to stop on groups that aren’t the real piles",
    hint: "Try a different number of magnets than there are piles, or try the ring.",
    success:
      "The magnets did exactly their job (each dot ended up near its magnet), but the groups are wrong. They can’t count the piles for you, and they only see “close”, not shapes like a ring.",
  },
};

export const predictionWords = {
  question:
    "Three piles, three magnets. If you drop the magnets twenty different ways, will they find the three piles every time?",
  always: "Every time",
  sometimes: "Sometimes two share a pile",
};

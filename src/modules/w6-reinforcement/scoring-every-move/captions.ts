// Every word the learner sees in this lesson (check-captions reads this file whole).
export const captions = {
  opening:
    "A puppy wants to reach its food bowl on the far side of a board-game kitchen, without stepping in the lava. The floor is a little slippery, so now and then it slides sideways.",
  story:
    "After every move, the puppy updates its score for that move from that square. Good scores spread back from the bowl, square by square.",
  compare: {
    label: "Compare your puppy with a slow, steady learner",
    leftLabel: "Your puppy",
    rightLabel: "Slow and steady",
  },
};

export const words = {
  board:
    "The kitchen board: tap or drag to paint squares. Arrows show how good each move looks from each square.",
  puppy: "the puppy",
  paint: {
    instructions:
      "Arrow keys move around the board; Enter or Space paints the square with the chosen brush.",
    square: (row: string, column: string, kind: string) => `Row ${row}, square ${column}: ${kind}`,
    kinds: { floor: "floor", wall: "wall", trap: "lava", coin: "treat", goal: "bowl" },
  },
  rewards: "How well each try went, from first to latest",
  tries: (count: string) => `${count} tries so far.`,
  brush: {
    label: "Paint with",
    floor: "Floor",
    wall: "Wall",
    trap: "Lava",
    coin: "Treat",
    goal: "Bowl",
  },
  curiosity: {
    label: "How curious",
    never: "never tries new moves",
    sometimes: "sometimes tries new moves",
    often: "often tries new moves",
  },
  learnRate: {
    label: "How fast it learns",
    slow: "changes its mind slowly",
    medium: "changes its mind quite fast",
    fast: "changes its mind at once",
  },
  lookAhead: {
    label: "How far ahead it cares",
    now: "cares about right now",
    soon: "cares about the next few moves",
    later: "cares about the long run",
  },
  speed: {
    label: "How fast to play",
    walk: "a slow walk",
    run: "a quick run",
    blur: "a blur",
  },
  play: "Let it practise",
  pause: "Pause",
  fresh: "Start fresh",
  drawer: {
    mechanics: "How the scores change",
    scores:
      "Every square keeps four scores, one for each move. After a move, that move’s score is nudged towards what the puppy got straight away plus the best score of the square it landed on.",
    dials:
      "“How far ahead it cares” shrinks that best next score, so far-off food counts for less. “How fast it learns” is the size of the nudge. “How curious” is how often it tries a random move instead of its best one.",
    maths: "The maths",
    formula:
      "new score = old score + learning speed × (reward now + care × best next score − old score)",
  },
};

export const missionWords = {
  goal: "Make it learn too fast to settle",
  hint: "Turn “How fast it learns” all the way up, speed it up, and let it practise for a while.",
  success:
    "Learning at full speed, every slip on the slippery floor rewrote a score completely, so the scores kept jumping about and never settled down.",
};

export const predictionWords = {
  question:
    "Once it has learned, will the puppy tiptoe right along the lava, or keep a safe distance?",
  edge: "Right along the lava",
  safe: "A safe distance away",
};

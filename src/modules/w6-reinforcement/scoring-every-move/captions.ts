// Every word the learner sees in this lesson, kept here so it can be reviewed in one place.
import { count, sentenceStart } from "@/design/copy";

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
    "The kitchen board: tap a square to paint it, or press, hold and drag to paint several. Arrows show how good each move looks from each square.",
  puppy: "the puppy",
  paint: {
    instructions:
      "Arrow keys move around the board; Enter or Space paints the square with the chosen brush.",
    square: (row: string, column: string, kind: string) => `Row ${row}, square ${column}: ${kind}`,
    kinds: { floor: "floor", wall: "wall", trap: "lava", coin: "treat", goal: "bowl" },
  },
  treats: "Treats never run out: the puppy gets one every time it steps on one.",
  rewards: "How well each try went, from first to latest",
  rewardsNote: "Above the faint line, a try won more than it lost.",
  tries: (tries: number) =>
    tries === 1 ? "One try so far." : `${sentenceStart(count(tries))} tries so far.`,
  bowl: {
    "no-goal": "There’s no bowl on the board, so the puppy has nothing to aim for.",
    blocked: "The bowl can’t be reached: walls or lava block every way to it.",
  },
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
    rarely: "tries new moves now and then",
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
  telescope: "A telescope: the dots show how much food further away still counts",
  speed: {
    label: "How fast to play",
    walk: "a walk you can follow",
    trot: "a trot",
    run: "a run",
    blur: "a blur",
  },
  play: "Let it practise",
  pause: "Pause",
  fresh: "Start fresh",
  describe: {
    idle: "The puppy hasn’t practised yet.",
    found: "The puppy has found a way to its bowl.",
    looking: "The puppy is still looking for a way to its bowl.",
    pacing: "The puppy has found a treat it can pace back and forth on.",
  },
  drawer: {
    mechanics: "How the scores change",
    scores:
      "Every square keeps four scores, one for each move. After a move, that move’s score is nudged towards what the puppy got straight away plus the best score of the square it landed on.",
    dials:
      "“How far ahead it cares” shrinks that best next score, so far-off food counts for less. “How fast it learns” is the size of the nudge. “How curious” is how often it tries a random move instead of its best one.",
    treats:
      "A treat pays every time the puppy steps on it, so pacing beside one can be worth more than going home. The puppy learns exactly what was rewarded, not what was meant.",
    maths: "The maths",
    formula:
      "new score = old score + learning speed × (reward now + care × best next score − old score)",
  },
};

export const missionWords = {
  tooFast: {
    goal: "Make it learn too fast to settle",
    hint: "Turn “How fast it learns” all the way up, speed it up, and let it practise for a while.",
    success:
      "Learning at full speed, every slip on the slippery floor rewrote a score completely, so the scores kept jumping about and never settled down.",
  },
  loophole: {
    goal: "Make the puppy find a loophole",
    hint: "Treats never run out. Paint a treat right next to the puppy and let it practise.",
    success:
      "It learned to pace back and forth over the treat forever instead of going to its bowl. It did exactly what you rewarded, not what you meant.",
  },
  neverExplore: {
    goal: "Make it never try anything new",
    hint: "Turn “How curious” all the way down and let it practise.",
    success:
      "With no curiosity it only ever repeats the move it already thinks is best, so a better way it has never tried stays hidden forever.",
  },
  noWayThrough: {
    goal: "Build a maze it can’t solve",
    hint: "Paint walls or lava until no path reaches the bowl, then let it practise.",
    success:
      "With no way through, no score can ever point home: the puppy wanders until each try runs out of moves.",
  },
};

export const predictionWords = {
  question:
    "Once it has learned, will the puppy tiptoe right along the lava, or keep a safe distance?",
  edge: "Right along the lava",
  safe: "A safe distance away",
};

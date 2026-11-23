// Every word the learner sees in this lesson, kept here so it can be reviewed in one place.
import { count } from "@/design/copy";

export const captions = {
  opening:
    "A puppy’s kitchen as a little board game: floor, walls, lava and a food bowl. Each move goes up, down, left or right, and a slippery floor can slide the puppy sideways. Paint the board and watch its best move from every square.",
  story:
    "The board is all there is: places, moves, the chance of sliding, and what each square pays. Knowing all that, the best move from every square can be worked out exactly, before the puppy takes a single step.",
  compare: {
    label: "Compare with a different floor",
    leftLabel: "Your floor",
    rightLabel: "The other floor",
  },
};

const times = (slides: number) =>
  slides === 0
    ? "without sliding once"
    : slides === 1
      ? "sliding once"
      : `sliding ${count(slides)} times`;

export const words = {
  board:
    "The kitchen board: tap a square to paint it, or press, hold and drag to paint several. Arrows show the puppy’s best move from each square.",
  boardStill: "The kitchen board with the puppy’s best move from each square.",
  paint: {
    instructions:
      "Arrow keys move around the board; Enter or Space paints the square with the chosen brush.",
    square: (row: string, column: string, kind: string) => `Row ${row}, square ${column}: ${kind}`,
    kinds: { floor: "floor", wall: "wall", trap: "lava", coin: "treat", goal: "bowl" },
  },
  brush: {
    label: "Paint with",
    floor: "Floor",
    wall: "Wall",
    trap: "Lava",
    coin: "Treat",
    goal: "Bowl",
  },
  arrows:
    "The long arrow on each square is its best move. Short side arrows show how often that move slides sideways instead.",
  traps: {
    none: "No square is a trap yet.",
    some: "A dashed square is a trap: even the safest way home from there ends in the lava more often than at the bowl.",
  },
  trip: {
    home: (moves: number) =>
      `Following its plan, a walk home takes about ${count(moves)} ${moves === 1 ? "move" : "moves"}.`,
    lava: "Following its plan, the puppy ends up in the lava more often than at its bowl.",
    forever: "Following its plan, the puppy may wander for ever and never finish a walk.",
  },
  bowl: {
    "no-goal": "There’s no bowl on the board, so no move is better than another.",
    blocked: "The bowl can’t be reached: walls or lava block every way to it.",
  },
  walk: {
    try: "Try a walk",
    again: "Try another walk",
    walking: "The puppy is walking its plan…",
    none: "Try a walk to see the plan played out, slides and all.",
    goal: (moves: number, slides: number) =>
      `That walk reached the bowl in ${count(moves)} ${moves === 1 ? "move" : "moves"}, ${times(slides)}.`,
    trap: (moves: number, slid: boolean) =>
      `That walk ${slid ? "slid" : "stepped"} into the lava after ${count(moves)} ${moves === 1 ? "move" : "moves"}.`,
    limit: (moves: number) => `That walk was still going after ${count(moves)} moves.`,
  },
  slippery: {
    label: "How slippery",
    still: "not slippery at all",
    little: "a little slippery",
    some: "slippery",
    very: "very slippery",
  },
  tiring: {
    label: "How tiring each move",
    free: "moves are free",
    little: "a little tiring",
    some: "tiring",
    very: "exhausting",
  },
  describe: {
    traps: (squares: number) =>
      squares === 1 ? "One square is a trap." : `${count(squares)} squares are traps.`,
  },
  drawer: [
    {
      title: "How the best move is worked out",
      paragraphs: [
        "The board game has places (the squares), moves (up, down, left, right), chances (a move may slide to either side) and rewards (the bowl, the lava, and a small cost for every tiring move). When all of that is known, nothing needs practising.",
        "Start with every square worth nothing. Then, again and again, let each square be worth its best move: what that move pays straight away, plus most of what the square it lands on is worth. After enough rounds nothing changes, and every square’s best move is its arrow.",
        "On a slippery floor a square beside the lava is worth less, because a slide could end everything, so the plan keeps away from the edge even when that is a longer way round. Next to a wall a slide has nowhere to go, so a plan may press into a wall and wait for a lucky slide.",
        "When every move is exhausting, a long walk home costs more than the bowl is worth, and stepping into the lava straight away can look best. The plan only knows the rewards it was given.",
        "A trap square is one where even the safest way home, with no hurry at all, ends in the lava more often than at the bowl. Lava on both sides of a square on a slippery floor does it.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is a Markov decision process: states (squares), actions (moves), transition chances P(s′ | s, a) and rewards R. The best plan comes from value iteration: V(s) ← max over a of Σ P(s′ | s, a) × (R + γ × V(s′)), with γ = 0.95, repeated until no value changes by more than one millionth.",
        "A slip sends a move to each side with half the slip chance. The trap test uses the same sweep with the bowl worth 1, the lava 0, no cost and γ = 1: that gives each square’s best possible chance of ever reaching the bowl.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Make a trap square",
  hint: "Paint lava on both sides of a floor square, then make the floor slippery.",
  success:
    "On a floor this slippery, one slide either way from that square lands in the lava, so even the safest way home fails more often than it works.",
};

export const predictionWords = {
  question:
    "Make the floor very slippery. Will the puppy’s trip home get longer, or stay about the same?",
  longer: "Longer",
  same: "About the same",
};

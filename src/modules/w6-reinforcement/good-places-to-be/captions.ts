// Every word the learner sees in this lesson, kept here so it can be reviewed in one place.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "The puppy’s garden has a food bowl in the far corner. Some squares are better places to be than others: the closer to the bowl, the better. Spread a warm glow from the bowl and watch it find the good places.",
  story:
    "Each spread, every square looks one move ahead and takes on the glow of the best square it could reach. So the glow travels out from the bowl one square at a time, and fades the further it goes.",
  compare: {
    label: "Compare with “How far ahead it cares” turned the other way",
    leftLabel: "Your puppy",
    rightLabel: "Turned the other way",
  },
};

export const words = {
  board:
    "The garden board: tap a square to paint it, or press, hold and drag to paint several. Warm squares are good places to be, marked with a plus; arrows point to the best next square.",
  boardStill: "The garden board, warm where it is a good place to be.",
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
    goal: "Bowl",
  },
  spread: "Spread the glow",
  again: "Spread it again",
  working: "Working it out…",
  waiting: "Tap “Spread the glow” to watch the good places light up.",
  spreads: (spreads: number) =>
    spreads === 0
      ? "Before any spreading, every square is as cold as the next."
      : spreads === 1
        ? "After one spread."
        : `After ${count(spreads)} spreads.`,
  corner: {
    warm: "The puppy’s corner is warm: it is a good place to be.",
    cold: "The puppy’s corner isn’t warm yet.",
  },
  settled: (warm: number) =>
    warm === 0
      ? "The glow has stopped spreading, and nothing glows: with no reward anywhere it can reach, no square is a good place to be."
      : `The glow has stopped spreading. ${sentenceStart(count(warm))} ${warm === 1 ? "square is" : "squares are"} warm.`,
  bowl: {
    "no-goal": "There’s no bowl on the board.",
    blocked: "The bowl can’t be reached from the puppy’s corner.",
  },
  care: {
    label: "How far ahead it cares",
    now: "right now",
    soon: "the next few moves",
    later: "the long run",
  },
  slippery: {
    label: "How slippery",
    still: "not slippery at all",
    little: "a little slippery",
    some: "slippery",
    very: "very slippery",
  },
  drawer: [
    {
      title: "How the glow spreads",
      paragraphs: [
        "A square’s glow is how good a place it is to be: how much food the puppy can expect from there if it plays its best. Squares start cold. In each spread, every square looks at the squares it could move to, and takes on most of the best one’s glow.",
        "Only squares next to the bowl warm up in the first spread. In the second, their neighbours do, and so on: one square further each time, so the far corner has to wait.",
        "“How far ahead it cares” is how much glow survives each move. Caring little, the glow fades within a few squares and far squares stay cold. A slippery floor makes squares near the lava less good, because a slide could end it all.",
        "Once the glow has settled, the best move from any square is simply towards its warmest neighbour. With no bowl to start from, there is nothing to spread.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is the value function V(s): the reward expected from square s with the best play. Each spread is one sweep of value iteration, V(s) ← max over moves a of Σ P(s′ | s, a) × (R + γ × V(s′)), starting from V = 0. After k sweeps V holds the best reward reachable within k moves, which is why it spreads one square per sweep.",
        "Here the bowl pays 1, moves are free and γ is the dial times 0.99. A square is warm from 0.1 up; the run stops when no square changes by more than 0.002 in a sweep.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Hide the reward entirely",
  hint: "Paint over the bowl (or wall it in), then spread the glow.",
  success:
    "The glow only ever starts at a reward. With none to reach, every square stays as cold as the next: no place is better than any other, so the puppy has no reason to go anywhere.",
};

export const predictionWords = {
  question: "After three spreads, will the puppy’s corner be warm yet?",
  warm: "Yes, already warm",
  notYet: "Not yet",
};

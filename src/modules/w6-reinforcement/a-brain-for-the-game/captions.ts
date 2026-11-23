// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "A fruit drops down a tiny arcade screen, and the basket at the bottom has to catch it. This player has no table of scores to look things up in. It has a small thinking network that looks at the screen and guesses how good each move is. Let it practise and watch it learn.",
  story:
    "After every move, the network checks its guesses against what really happened. It doesn't only study the game it just played: it pulls out a mix of old moves from its memory, so one unlucky game can't drag it off course.",
  compare: {
    label: "Compare with the other end of its memory",
    leftLabel: "Your player",
    rightLabel: "Other memory",
  },
};

export const words = {
  screen: "The arcade screen: a fruit falling towards the basket.",
  screenCaught: (caught: boolean) =>
    caught
      ? "In this test drop, the basket catches the fruit."
      : "In this test drop, the basket misses the fruit.",
  caughtMark: "Caught",
  missedMark: "Missed",
  tests: "Its test: every place the fruit can fall, with every place the basket can start",
  testsLabel: (catches: number) => `It catches ${count(catches)} of the ${count(25)} test drops.`,
  catches: (catches: number) =>
    catches >= 25
      ? "It catches every test fruit."
      : catches >= 20
        ? "It catches nearly every test fruit."
        : catches >= 10
          ? "It catches some test fruit and misses lots."
          : "It misses most test fruit.",
  games: (games: number, done: boolean) =>
    games === 0
      ? "It hasn't practised yet."
      : `${sentenceStart(count(games))} practice ${games === 1 ? "game" : "games"}${done ? ", all it gets here." : "."}`,
  line: "How many test fruit it catches, game after game",
  lineNote: "The faint line is a basket that moves at random.",
  memory: {
    label: "How much it remembers",
    describe: (stop: number) =>
      [
        "Only its last move",
        "Its last game",
        "Its last few games",
        "About fifteen games",
        "About sixty games",
        "Hundreds of games",
      ][stop] ?? "Hundreds of games",
  },
  learning: {
    label: "How fast it learns",
    describe: (stop: number) =>
      ["Very slowly", "Slowly", "Steadily", "Quickly", "Very quickly", "In big leaps"][stop] ??
      "Quickly",
  },
  practise: "Let it practise",
  pause: "Pause",
  again: "Start again",
  failed:
    "The player stopped practising because something went wrong. Start again to try once more.",
  describe: (games: string, catches: string) => `${games} ${catches}`,
  drawer: [
    {
      title: "How the network plays",
      paragraphs: [
        "The network reads three things from the screen: which column the fruit is in, how far down it has fallen, and where the basket is. It answers with a score for each move: left, stay or right. The basket takes the move with the best score, and now and then a random one, more often at the start, so it gets to try things.",
        "After each move it nudges its scores towards what that move really earned: a point for a catch, a point taken away for a miss, plus the best score it expects from where it ended up.",
        "Its memory keeps its most recent moves. After every move it studies a handful picked at random from the memory, so old games and new ones are mixed together. With a memory of only its last move, it studies the same move over and over and forgets everything else, so it keeps undoing what it learned.",
        "It also keeps a frozen copy of itself, updated every so often, to say what the future is worth. Aiming at a target that moves less keeps it steady.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is a deep Q-network (DQN). The network Q(s, a) has one hidden layer of 16 tanh cells. Each study step lowers the squared gap between Q(s, a) and r + 0.95 × max Q′(s′, a′), where Q′ is the target copy, refreshed every 40 study steps (no future term at the end of a drop).",
        "Experience replay: every move (s, a, r, s′) goes into a buffer of 1 to 1000 moves; each study step uses 16 moves drawn from it at random. Exploration is ε-greedy, with ε falling from 1 to 0.05 over the first 200 games. The optimiser is Adam with a step size from 0.003 to 0.05.",
        "A basket moving at random catches 1 drop in 5. Seed 1, 500 games, at the starting dials: all 25 test drops caught. With a buffer of one move, no step size reaches 20 of 25.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Take away its memory of past games",
  hint: "Turn its memory all the way down, so it only remembers its last move, and let it practise every game.",
  success:
    "With only its last move to study, each lesson wipes out the one before, so its practice stalled. Mixing old games back in is what lets a network learn steadily.",
};

export const predictionWords = {
  question:
    "Give it a memory of only its last move, then let it play every practice game. How will it catch?",
  well: "Nearly every fruit",
  stalls: "It keeps missing lots",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.

import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "Here is a game of Four in a Row against the computer. Drop a disc, and before it answers it plays out lots of pretend games in its head. Watch the tree of pretend games grow.",
  story:
    "It never learned this game. Before each move it plays hundreds of quick pretend games from here, mostly with random moves, and keeps count of how each first move turned out. Moves that keep winning get tried more, so the tree grows thick where the good moves are.",
  compare: {
    label: "Compare its thinking with a different number of pretend games",
    leftLabel: "Your setting",
    rightLabel: "The other setting",
  },
};

type Place = "farLeft" | "left" | "middle" | "right" | "farRight";

const PLACE: Record<Place, string> = {
  farLeft: "the far-left column",
  left: "a column on the left",
  middle: "the middle column",
  right: "a column on the right",
  farRight: "the far-right column",
};

const ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];

export const words = {
  futures: {
    label: "How many futures it imagines",
    steps: [
      "only its own next move",
      "a handful of pretend games",
      "about a hundred pretend games",
      "a few hundred pretend games",
      "about a thousand pretend games",
      "a few thousand pretend games",
      "ten thousand pretend games",
    ],
  },
  length: {
    label: "How long each pretend game runs",
    steps: [
      "one more move, then stop",
      "two more moves",
      "four more moves",
      "eight more moves",
      "sixteen more moves",
      "right to the end",
    ],
  },
  board: "The game board: seven columns, six holes high",
  you: "Your discs: with a ring",
  it: "Its discs: with a cross",
  column: (column: number, room: number) =>
    room > 0
      ? `Drop a disc in the ${ORDINAL[column] ?? ""} column (room for ${count(room)} more)`
      : `The ${ORDINAL[column] ?? ""} column is full`,
  columnsLabel: "Columns: use the left and right arrow keys, then Enter to drop",
  status: {
    yourTurn: "Your turn. Tap a column, or use the arrow keys and Enter.",
    start: "Your turn first. Tap a column, or use the arrow keys and Enter.",
    thinking: "It is playing pretend games in its head…",
    choosing: "It has decided. Here it comes…",
    wait: "Hang on: it is still thinking. Your turn is next.",
    full: "That column is full. Try another one.",
    youWon: "You won: four in a row!",
    itWon: "It won this time: four in a row.",
    draw: "The board is full and nobody made four. A draw.",
  },
  newGame: "New game",
  puzzle: "Try the puzzle",
  puzzleNote:
    "The puzzle: your discs climb a slant towards the far-right column. One more there and you win. Can it see that coming?",
  tree: {
    title: "Its pretend games",
    picture:
      "A tree of pretend games: one branch for each column it could drop in, thicker where it imagined more games, with your possible replies growing from each",
    empty: "Once it is its turn, a tree of pretend games will grow here.",
    now: "For this move",
    last: "How it chose its last move",
    favourite: (place: Place, share: number) =>
      `It imagined most games through ${PLACE[place]}${share < 0.05 ? ", and won almost none of them." : `, and won about ${count(Math.round(share * 10))} in every ten of them.`}`,
    looked: "It only checked whether its own next disc would win. It never imagined your reply.",
    differs:
      "With the dials as they are now, it would choose a different column than the one it played.",
  },
  key: {
    branch: "Thicker branch: more pretend games",
    pick: "Its pick",
  },
  describe: {
    start: "An empty board. Your turn first.",
    yourTurn: (discs: number) =>
      `Your turn. ${sentenceStart(count(discs))} discs are on the board.`,
    thinking: "It is thinking about its move.",
    over: (result: string) => result,
    favourite: (place: Place) => `Its pretend games went mostly through ${PLACE[place]}.`,
  },
  drawer: [
    {
      title: "How it thinks",
      paragraphs: [
        "Before each move it plays pretend games in its head, starting from the board as it is. Each pretend game goes down the moves it has already tried, picking ones that went well and ones it has hardly tried, then adds one new move, then finishes the game with random moves.",
        "Every move on the way gets a point if its side won that pretend game, half a point for a draw or a game stopped early, and nothing for a loss. After all the pretend games it plays the move it tried most often.",
        "Because good moves win more pretend games, they get tried more, and the tree grows thick where the good moves are. Bad moves are dropped after a few tries.",
        "At the very bottom of the first dial it plays no pretend games at all: it only checks whether one of its own discs wins at once, and otherwise drops in the middle. It never thinks about what you will do next.",
        "Shorter pretend games end before anyone wins, so they tell it less. They are quicker, but the computer plays worse.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is Monte Carlo tree search. Going down the tree it picks the move with the best score w/n + c·√(ln N / n), where w is the move's points, n how often it was tried, N how often its parent was tried and c = √2 (UCB1).",
        "One new move is added per pretend game, the rest is random play (the rollout), and the result is passed back up the path. The final choice is the most visited move. The same moves and dials use the same random seed, so a link thinks the same thoughts.",
        "Game programs such as AlphaGo use the same search, but they replace the random rollouts with a trained network that guesses who is winning.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Let it look one move ahead",
  hint: "Turn “How many futures it imagines” all the way down, tap “Try the puzzle”, then drop your disc in the far-right column.",
  success:
    "Looking only one move ahead, it checked whether its own disc could win, and none could. It never imagined your reply, so it missed your slant, and you won.",
};

export const predictionWords = {
  question:
    "In the puzzle it plays thousands of pretend games before it moves. Where will most of them go?",
  even: "Spread evenly over all seven columns",
  one: "Mostly through one column",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.

import { count, outOf } from "@/design/copy";

export const captions = {
  opening:
    "Pip and Pop are two copies of the same beginner. They play a stick game: take one, two or three sticks, and whoever takes the last stick wins. Nobody teaches them. Let them practise against each other and watch what they learn.",
  story:
    "Each copy learns from every game it plays against the other. When one finds a trick, the other gets beaten by it and learns to answer it, so both keep getting better, trading wins as they go.",
  compare: {
    label: "Compare practice with Pop frozen and Pop learning",
    leftLabel: "Your practice",
    rightLabel: "Pop the other way",
  },
};

export const words = {
  games: {
    label: "How many practice games",
    steps: [
      "fifty games",
      "a hundred games",
      "two hundred games",
      "five hundred games",
      "a thousand games",
      "two thousand games",
      "four thousand games",
    ],
  },
  curiosity: {
    label: "How curious",
    never: "never tries anything new",
    rarely: "tries something new now and then",
    sometimes: "tries something new quite often",
    often: "mostly tries things at random",
  },
  frozen: "Freeze Pop (it stops learning)",
  start: "Start practising",
  again: "Practise again",
  working: "Practising…",
  table: {
    title: "Their newest practice game",
    picture: (taker: string) =>
      `Twenty-one sticks in the order they were taken. ${taker} took the last stick.`,
    waiting: "Twenty-one sticks wait on the table.",
    lastStick: (name: string) => `${name} took the last stick and won.`,
  },
  names: { pip: "Pip", pop: "Pop" },
  key: {
    pip: "Pip's turns (round tops)",
    pop: "Pop's turns (square tops)",
  },
  habits: {
    title: "What each one takes, from twenty-one sticks down to one",
    picture: (name: string, knows: number) =>
      `${name}'s favourite take for every number of sticks left. It makes the perfect move from ${count(knows)} of the sixteen piles where one exists.`,
    star: "Starred: the move a perfect player would make",
    none: "Dash: no move wins from here against a perfect player",
    frozen: "Pop is frozen: its habits never change",
    before: "Before practice, each copy has its own random little habits.",
    knows: (name: string, knows: number) =>
      `${name} makes the perfect move from ${count(knows)} of sixteen piles.`,
  },
  chart: {
    title: "How Pip is doing",
    picture:
      "Two lines over the practice: Pip's wins against Pop, and Pip's wins against a newcomer",
    partner: "Solid line: Pip's wins against Pop lately",
    newcomer: "Dashed line: Pip's wins against a newcomer who plays well",
    even: "Dotted line: winning half",
  },
  result: {
    partner: (share: number) =>
      `Lately Pip wins ${outOf(share, { total: 10, noun: "games" })} against Pop.`,
    newcomer: (share: number) =>
      `Tested against a newcomer who plays well, Pip won ${outOf(share, { total: 10, noun: "games" })}.`,
    waiting: "Tap “Start practising” to let them play each other.",
    working: "They are playing practice games…",
  },
  describe: {
    waiting: "Pip and Pop are waiting to start practising.",
    working: "Pip and Pop are practising.",
    done: (partner: string, newcomer: string) => `Practice is over. ${partner} ${newcomer}`,
  },
  drawer: [
    {
      title: "How they learn",
      paragraphs: [
        "Each player keeps a score for every move from every number of sticks: how well that move has gone for it so far. It plays its best-scoring move, except that now and then, as curious as the dial says, it tries a random one instead.",
        "After each game, every move the winner made gets its score nudged up, and every move the loser made gets nudged down. Nobody tells them which move was good: they only find out who won.",
        "When both learn, each one's tricks get punished by the other, so they keep finding better moves. When Pop is frozen it plays the same way every game, so Pip only learns what beats Pop's habits. A newcomer who plays differently soon finds the holes.",
        "The secret of this game: leave the other player four, eight, twelve, sixteen or twenty sticks. Whatever they take, you can bring it back to a multiple of four, and you take the last stick.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is self-play with Monte Carlo learning. Each player has a table Q(s, a) for s sticks left and a take a. After a game, every move it made is nudged towards the result G (+1 for a win, −1 for a loss): Q ← Q + 0.1 · (G − Q).",
        "Moves are chosen ε-greedily: with chance ε (the curiosity dial) a random take, otherwise the take with the highest Q. Too much curiosity muddles the scores, because they then measure games full of random moves.",
        "Games alternate who starts. The newcomer leaves a multiple of four whenever it can and otherwise takes at random; Pip moves first from twenty-one, where a perfect player always wins. AlphaZero learned Go and chess the same way, by playing against itself, with a network in place of the table.",
      ],
    },
  ],
};

export const curiosityWords = (value: number) =>
  value < 0.02
    ? words.curiosity.never
    : value < 0.15
      ? words.curiosity.rarely
      : value < 0.5
        ? words.curiosity.sometimes
        : words.curiosity.often;

export const missionWords = {
  goal: "Freeze one so the other learns a cheap trick",
  hint: "Switch on “Freeze Pop”, then start practising.",
  success:
    "Pop played the same way every game, so Pip only had to learn what beats Pop's habits. It wins nearly every game against Pop, but a newcomer who plays well beats it: Pip never learned the real secret.",
};

export const predictionWords = {
  question:
    "Pip and Pop both learn from every game they play against each other. After a thousand games or more, who wins more often?",
  pip: "Pip wins most games",
  even: "They trade wins about evenly",
  pop: "Pop wins most games",
};

// Every word the learner sees in this lesson, kept here so it can be reviewed in one place.
import { count } from "@/design/copy";

export const captions = {
  opening:
    "The puppy can have a small bowl of food two moves away, or a big feast ten moves away. A telescope dial sets how far ahead it looks: does food later count as much as food now?",
  story:
    "Food further away counts for a little less with every move it takes to reach it. Look far ahead and the big bowl wins; look only at right now and the small bowl nearby wins.",
  compare: {
    label: "Compare with the telescope turned the other way",
    leftLabel: "Your puppy",
    rightLabel: "Telescope turned around",
  },
};

export const words = {
  board:
    "The puppy’s board: a small bowl near the start and a big one in the far corner. Arrows show its best move from each square, and paw prints its way from the start.",
  care: {
    label: "How far ahead it cares",
    second: "only this very second",
    now: "right now",
    soon: "the next few moves",
    later: "the long run",
  },
  prize: {
    label: "How big the far bowl",
    same: "the same as the near one",
    bigger: "a bit bigger",
    much: "much bigger",
    feast: "a feast",
  },
  telescope: {
    label:
      "A telescope looking along the way from the start. Each bowl is drawn as big as it counts from the start; its dashed outline is how big it really is.",
    key: "Dashed: how big each bowl really is. Filled: how much it counts from where the puppy starts.",
    near: (moves: number) => `Small bowl, ${count(moves)} moves away`,
    far: (moves: number) => `Big bowl, ${count(moves)} moves away`,
  },
  heads: {
    near: "It heads for the small bowl nearby.",
    far: "It heads for the big bowl far away.",
    neither: "It sees no reason to move: no bowl counts for anything yet.",
  },
  drawer: [
    {
      title: "Why later counts for less",
      paragraphs: [
        "With every extra move it takes to reach some food, that food counts for a little less. “How far ahead it cares” is how much is kept each move: keep almost all of it and a feast ten moves away still counts for a lot; keep little and only food a move or two away matters.",
        "That is also why the puppy likes short routes: the same bowl reached sooner counts for more.",
        "Caring about only this very second, a move is worth just what it pays straight away. No first move from the start reaches a bowl, so every move looks the same and the puppy has no reason to go anywhere.",
        "People do this too: a sweet now can beat a bigger treat next week. Neither way is wrong; it depends how much the later thing is worth waiting for.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is discounting. A reward that arrives on the t-th move counts γ^(t−1) times as much as one on the first move, with γ (gamma) between 0 and 1; here γ is the dial times 0.99.",
        "From the start the small bowl is worth γ × 1 and the big one γ^9 × its size, so the plan switches to the big bowl once γ^8 is bigger than 1 ÷ the big bowl’s size: about 0.84 for a bowl four times as big. With γ = 0 every first move is worth 0, so nothing is preferred.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Make it care only about this second",
  hint: "Turn “How far ahead it cares” all the way down.",
  success:
    "Caring only about this very second, a move is worth just what it pays straight away. No first move reaches a bowl, so every move looks the same and the puppy goes nowhere.",
};

export const predictionWords = {
  question: "Turn the telescope down to “right now”. Which bowl will the puppy head for?",
  near: "The small bowl nearby",
  far: "The big bowl far away",
};

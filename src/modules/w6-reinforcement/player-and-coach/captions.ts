// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "A puppy has to find its bowl on a little board, without stepping in the lava. Two helpers learn together: a player who picks the moves, and a coach who watches and judges how well things are going from each square. Let them practise and watch them side by side.",
  story:
    "The coach's judgement tells the player which moves went better than expected and which went worse. The player then shifts its habits towards the better moves, but only a little after each batch of tries, so one lucky or unlucky batch can't throw it off.",
  compare: {
    label: "Compare with the safety rail switched the other way",
    leftLabel: "Your player",
    rightLabel: "Rail switched",
  },
};

export const words = {
  player: "The player",
  playerNote: "Longer arrows: moves it picks more often. The darkest arrow is its favourite.",
  playerBoard:
    "The player's board: arrows on each square show which way it tends to move, and the puppy walks one of its tries.",
  coach: "The coach",
  coachNote:
    "A plus and a warm glow: the coach expects things to go well from there. A minus: badly.",
  coachBoard:
    "The coach's board: each square shows how well the coach expects things to go from there.",
  score: (score: number) =>
    score >= 0.6
      ? "The player walks to the bowl nearly every time."
      : score >= 0.2
        ? "The player often reaches the bowl."
        : score >= -0.5
          ? "The player sometimes reaches the bowl."
          : "The player mostly steps in the lava or gets lost.",
  change: (change: number) =>
    change < 0.03
      ? "Its last batch hardly changed its habits."
      : change < 0.3
        ? "Its last batch changed its habits a little."
        : change < 0.8
          ? "Its last batch changed its habits quite a lot."
          : "Its last batch turned its habits upside down.",
  changeLabel: "How much the last batch changed the player's habits",
  batches: (batches: number, done: boolean) =>
    batches === 0
      ? "It hasn't practised yet."
      : `${sentenceStart(count(batches))} ${batches === 1 ? "batch" : "batches"} of tries${done ? ", all it gets here." : "."}`,
  line: "How well the player does, batch after batch",
  lineNote:
    "The flat dotted line is a player that picks its moves at random. A dashed line is the run before.",
  clip: {
    label: "How small the changes stay",
    describe: (stop: number) =>
      ["Tiny changes only", "Small changes", "Bigger changes", "No limit: the rail is off"][stop] ??
      "Small changes",
  },
  rounds: {
    label: "How many times it studies each batch",
    describe: (stop: number) =>
      ["Once", "Twice", "Five times", "Ten times", "Twenty times", "Forty times"][stop] ??
      "Ten times",
  },
  practise: "Let them practise",
  pause: "Pause",
  again: "Start again",
  failed:
    "The player and coach stopped practising because something went wrong. Start again to try once more.",
  describe: (batches: string, score: string) => `${batches} ${score}`,
  drawer: [
    {
      title: "How the player and coach learn",
      paragraphs: [
        "The player is a small network that gives the chance of each move from each square. The coach is another small network that guesses how well things will go from each square.",
        "In each batch the player plays twelve tries. For every move, the coach compares what really happened next with what it expected. Better than expected: the player makes that move a little more likely. Worse: a little less likely. The coach also studies the batch, so its guesses improve too.",
        "Each batch can be studied several times, which squeezes more learning out of the same tries. The safety rail stops any move's chance from moving too far from what it was when the batch was played. Without the rail, studying the same batch over and over can push the player into a habit those few tries never really tested, and it may never find its way back.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is actor-critic with proximal policy optimisation (PPO). The actor π(a | s) and the critic V(s) each have one hidden layer of 16 tanh cells, read a one-hot square, and learn with Adam (steps 0.01 and 0.02).",
        "Advantage: A = G − V(s), where G is the discounted return (γ = 0.95), normalised within the batch. The actor maximises the mean of min(r·A, clip(r, 1 − ε, 1 + ε)·A), where r = π_new(a | s) ÷ π_old(a | s). ε is 0.1, 0.2 or 0.5; with no rail the plain r·A is used. The critic lowers (V(s) − G)².",
        "The score line is the exact expected reward per try of the current player (each move costs 0.04, the bowl pays 1, the lava −1, at most 25 moves, slipping sideways one move in ten), worked out over every slip rather than sampled. A random player scores about −1.0; seed 7 with the starting dials reaches about 0.7.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Remove the “small changes” safety rail",
  hint: "Switch the rail off completely and let it study each batch as many times as it can. Watch the score line after it climbs.",
  success:
    "Without the rail, studying the same batch over and over shoved the player into a bad habit, and its score fell apart after climbing. Keeping each change small is what makes this kind of training safe.",
};

export const predictionWords = {
  question:
    "Switch off the safety rail and let it study each batch forty times. What happens to the player's score?",
  climbs: "It keeps climbing",
  falls: "It climbs, then falls apart",
};

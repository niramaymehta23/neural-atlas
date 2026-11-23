// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";
import type { Rule, Trick } from "./model";

export const captions = {
  opening:
    "This puppy knows four tricks, but it has no idea which one you want. You want it to sit. Each round it does a trick, and you choose: give it a treat, or not.",
  story:
    "The puppy doesn't understand words. It only notices which tricks got a treat, and does those a little more often. Nobody tells it the right answer: it learns from what happens after it tries.",
  compare: {
    label: "Compare your puppy with one whose trainer only rewards sitting",
    leftLabel: "Your puppy",
    rightLabel: "Treats for sitting only",
  },
};

export const words = {
  mat: "The training mat: the puppy, the trick it is doing now, and how often it does each trick",
  want: "You want: Sit",
  tricks: {
    sit: "Sit",
    spin: "Spin",
    paw: "Give a paw",
    roll: "Roll over",
  } satisfies Record<Trick, string>,
  doing: (trick: string) => `It does: ${trick}`,
  now: "Now",
  /** How often it does a trick, in words; "most of the time" starts at the mission's line. */
  often: (share: number) =>
    share >= 0.8
      ? "almost always"
      : share >= 0.5
        ? "most of the time"
        : share >= 0.3
          ? "often"
          : share >= 0.1
            ? "sometimes"
            : "hardly ever",
  cardLabel: (trick: string, often: string) => `${trick}: it does this ${often}`,
  treat: "Give a treat",
  noTreat: "No treat",
  last: {
    none: "Waiting for your first choice.",
    treat: (trick: string) => `Last round it did “${trick}” and got a treat.`,
    noTreat: (trick: string) => `Last round it did “${trick}” and got no treat.`,
  },
  rounds: (rounds: number) =>
    rounds === 1 ? "One round so far." : `${sentenceStart(count(rounds))} rounds so far.`,
  full: "That's a lot of rounds. Start with a new puppy to train another.",
  trainer: {
    label: "A trainer gives treats for",
    play: (rounds: number) => `Let the trainer play ${count(rounds)} rounds`,
    rules: {
      sit: "Sitting",
      spin: "Spinning",
      paw: "Giving a paw",
      roll: "Rolling over",
      none: "Nothing at all",
    } satisfies Record<Rule, string>,
  },
  fresh: "Start with a new puppy",
  big: {
    label: "How big a treat",
    describe: (value: number) =>
      value < 0.4
        ? "a tiny crumb"
        : value < 1.2
          ? "a small biscuit"
          : value < 2.2
            ? "a big biscuit"
            : "a whole sausage",
  },
  playful: {
    label: "How playful",
    describe: (value: number) =>
      value < 0.2
        ? "sticks to its favourite"
        : value < 0.45
          ? "mostly does its favourite"
          : value < 0.75
            ? "likes to mix things up"
            : "does whatever it fancies",
  },
  describe: {
    even: (rounds: string) => `${rounds} The puppy mixes its four tricks evenly.`,
    favourite: (rounds: string, trick: string, often: string) =>
      `${rounds} The puppy does “${trick}” ${often}.`,
  },
  drawer: [
    {
      title: "How the puppy learns",
      paragraphs: [
        "The puppy keeps a liking for each trick. Each round it picks a trick at random, but tricks it likes more come up more often.",
        "After a treat, it likes the trick it just did a bit more and the others a bit less. It also remembers how many treats it usually gets: once treats are common, a round with no treat feels disappointing, and it likes that trick a bit less.",
        "“How big a treat” is how much one treat changes its liking. “How playful” is how much it mixes things up: a playful puppy still tries tricks it doesn't like much.",
        "If it never gets a treat, nothing ever stands out, so its liking never changes and it keeps mixing all four tricks.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is reinforcement learning: learning which action to take from rewards, not from being shown the answer. With one situation and a few actions it is called a bandit problem; this puppy is a gradient bandit.",
        "Each trick a has a preference H(a). The chance of doing it is a softmax: π(a) = e^(H(a)/τ) ÷ Σ e^(H(b)/τ), where τ is the temperature (“How playful”).",
        "After doing trick A and getting reward R (1 for a treat, 0 for none): H(A) += α (R − R̄)(1 − π(A)), and H(b) −= α (R − R̄) π(b) for every other trick. α is the step size (“How big a treat”), and R̄ is the average of the rewards before this round.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Reward the wrong trick",
  hint: "You want a sit, but give treats only when it does a different trick, or let the trainer reward spinning.",
  success:
    "The puppy now does the trick you rewarded most of the time, not the sit you wanted. It can't know what you meant: it only learns what earned a treat.",
};

export const predictionWords = {
  question: "If the puppy never gets a single treat, will it settle on one favourite trick?",
  settles: "Yes, it will pick a favourite",
  mixes: "No, it will keep mixing its tricks",
};

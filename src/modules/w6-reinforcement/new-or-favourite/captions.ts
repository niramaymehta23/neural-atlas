// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";
import type { Machine } from "./model";

export const captions = {
  opening:
    "Five slot machines, and each one secretly pays out more or less often than the others. You have a pocket of coins. Tap a machine to pull its lever and find out which one is best.",
  story:
    "Every pull on your favourite is a pull you didn't spend finding out about the others. Try too little and you may never find the best machine; try too much and you waste pulls on bad ones.",
  compare: {
    label: "Compare your race with a curious bot set the other way",
    leftLabel: "Your race",
    rightLabel: "Other curiosity",
  },
};

const plural = (value: number, one: string, many: string) =>
  `${count(value)} ${value === 1 ? one : many}`;

export const words = {
  machines: {
    star: "Star",
    moon: "Moon",
    heart: "Heart",
    bell: "Bell",
    leaf: "Leaf",
  } satisfies Record<Machine, string>,
  casino: "The casino: five slot machines, each marked with its own shape and pattern",
  pull: (machine: string, record: string) => `Pull the ${machine} machine. ${record}`,
  record: (wins: number, pulls: number) =>
    pulls === 0
      ? "Not pulled yet."
      : `${sentenceStart(plural(wins, "win", "wins"))} from ${plural(pulls, "pull", "pulls")}.`,
  won: "a coin",
  lost: "nothing",
  lastPull: {
    none: "Pick any machine to start.",
    won: (machine: string) => `The ${machine} machine paid a coin!`,
    lost: (machine: string) => `The ${machine} machine paid nothing this time.`,
  },
  left: (left: number, wins: number) =>
    `${sentenceStart(plural(left, "pull", "pulls"))} left. You have won ${plural(wins, "coin", "coins")}.`,
  done: (wins: number) =>
    `Out of pulls! You won ${plural(wins, "coin", "coins")}. Now see how two bots do it.`,
  again: "Play again",
  race: {
    title: "The bot race",
    waiting: "Tap “Start the race” to watch two bots play the same machines.",
    start: "Start the race",
    again: "Race again",
    working: "Racing…",
    track: "The race track: how many coins each bot has won",
    random: "A player picking at random",
    finish: "The most anyone could expect",
    botCoins: (bot: string, wins: number) => `${bot}: ${plural(wins, "coin", "coins")}`,
    pulls: (pulls: number, budget: number) =>
      `${sentenceStart(plural(pulls, "pull", "pulls"))} of ${count(budget)}.`,
    favourite: (machine: string) => `Plays the ${machine} machine most.`,
    stuck: (machine: string) => `Stuck on the ${machine} machine: it never tries anything else.`,
    spread: "Which machines it pulled",
    ahead: {
      curious: "“Curious sometimes” is ahead.",
      hopeful: "“Hopeful about the unknown” is ahead.",
      tied: "The bots are level.",
    },
  },
  bots: {
    curious: "Curious sometimes",
    hopeful: "Hopeful about the unknown",
    curiousNote: "Mostly plays its best machine so far; sometimes tries one at random.",
    hopefulNote: "Gives machines it has hardly tried the benefit of the doubt.",
  },
  secret: {
    title: "The secret: how often each machine really pays",
    chance: (machine: string, inTen: number) => `${machine}: about ${count(inTen)} times in ten`,
  },
  curious: {
    label: "How curious",
    describe: (value: number) =>
      value < 0.005
        ? "never tries anything new"
        : value < 0.08
          ? "tries something new now and then"
          : value < 0.2
            ? "sometimes tries something new"
            : value < 0.35
              ? "often tries something new"
              : "tries something new half the time",
  },
  budget: {
    label: "How many pulls",
    describe: (value: number) => `${count(value)} pulls each`,
  },
  describe: {
    yours: (pulls: number, wins: number) =>
      `You have pulled ${plural(pulls, "time", "times")} and won ${plural(wins, "coin", "coins")}.`,
    waiting: "The bots haven't raced yet.",
    racing: "The bots are racing.",
    done: (curious: number, hopeful: number) =>
      `The race is over: “Curious sometimes” won ${plural(curious, "coin", "coins")} and “Hopeful about the unknown” won ${plural(hopeful, "coin", "coins")}.`,
  },
  drawer: [
    {
      title: "How the bots choose",
      paragraphs: [
        "Each machine pays a coin with its own hidden chance. The only way to learn a machine's chance is to pull it, and every pull spent learning is a pull not spent on the machine you already think is best.",
        "“Curious sometimes” keeps each machine's average so far and plays the best one, except now and then (“How curious”) it pulls a random machine instead. With no curiosity at all, it plays whichever machine paid first, forever.",
        "“Hopeful about the unknown” first pulls every machine once. Then it adds a bonus to each machine's average: big for machines it has hardly tried, shrinking as it tries them more. So it keeps checking the machines it knows least, until it is fairly sure they are worse.",
        "Every machine pays from a fixed list of outcomes, so both bots, and a shared link, meet exactly the same machines.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is the explore–exploit trade-off, studied as the multi-armed bandit problem.",
        "Epsilon-greedy: with chance ε (“How curious”) pull a random arm, otherwise the arm with the highest average reward Q(a) = wins ÷ pulls.",
        "UCB1 (upper confidence bound): after one pull of each arm, pull the arm with the highest Q(a) + √(2 ln t ÷ N(a)), where t is the pulls so far and N(a) the pulls of arm a.",
        "Regret is the wins lost against always pulling the best arm. Epsilon-greedy with a fixed ε keeps losing a little forever; UCB's regret grows only like the logarithm of the pulls.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Never try anything new",
  hint: "Turn “How curious” all the way down, then start the race.",
  success:
    "With no curiosity, the bot played the first machine that paid out and never tried another. It never found out that a better machine was right next to it.",
};

export const predictionWords = {
  question:
    "Turn “How curious” right down so one bot never tries anything new. The other keeps checking the machines it knows least. Who ends the race with more coins?",
  never: "The one that never tries anything new",
  hopeful: "The one that keeps checking",
};

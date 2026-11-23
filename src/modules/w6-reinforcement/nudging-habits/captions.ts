// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import { count, outOf, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "A puppy has to cross a wide bridge to reach its food bowl, with lava on both sides. It has a habit on every square: how likely it is to step each way. At first every way is just as likely. Let it practise and watch the arrows bend.",
  story:
    "After every few tries the puppy looks back. Moves on tries that went better than usual get a little more likely; moves on tries that went worse get a little less likely. Do more of what worked.",
  compare: {
    label: "Compare your puppy with one given a different size of nudge",
    leftLabel: "Your puppy",
    rightLabel: "Other nudge",
  },
};

export const words = {
  board:
    "The bridge: lava along the top and bottom, the puppy on the left, its bowl on the right. On each square, four arrows show how likely each step is; longer means more likely. Small dashed rings mark the squares of its latest try.",
  nudge: {
    label: "How hard each nudge",
    tiny: "a tiny nudge",
    gentle: "a gentle nudge",
    firm: "a firm nudge",
    hard: "a hard shove",
    wild: "an enormous shove",
  },
  batch: {
    label: "Tries per nudge",
    one: "a nudge after every try",
    many: (tries: string) => `a nudge after every ${tries} tries`,
  },
  start: "Let it practise",
  again: "Practise again",
  working: "Practising…",
  another: "Another puppy",
  waiting: "Tap “Let it practise” to watch its habits change.",
  tries: (tries: number) =>
    tries === 1 ? "One try so far." : `${sentenceStart(count(tries))} tries so far.`,
  reached: (share: number) =>
    `Lately it reaches its bowl ${outOf(share, { total: 10, noun: "times" })}.`,
  lava: (share: number) => `It falls in the lava ${outOf(share, { total: 10, noun: "times" })}.`,
  chart: "How often it reaches its bowl, from its first tries to its latest",
  chartNote: "Higher is better. The faint line is a puppy that steps at random.",
  lucky: {
    more: (at: string) =>
      `Its first lucky try (try ${at}) reached the bowl. The nudge after it made those moves more likely.`,
    less: (at: string) =>
      `Its first lucky try (try ${at}) reached the bowl, but the nudge after it overshot and made those moves less likely.`,
    same: (at: string) =>
      `Its first lucky try (try ${at}) reached the bowl, and the nudge after it left those moves as they were.`,
  },
  wild: "Its habits have gone wild: it makes the same moves every time, and they hardly ever reach the bowl.",
  describe: {
    waiting: "The puppy hasn’t practised yet; every way is just as likely.",
    working: "The puppy is practising.",
    done: (reached: string) => `The puppy has practised. ${reached}`,
  },
  drawer: {
    mechanics: "How the habits change",
    habits:
      "On every square the puppy keeps four numbers, one for each way. The bigger a number, the more likely that step. Each try, it draws its steps from those chances, so it never does exactly the same thing twice until a habit is very strong.",
    nudges:
      "After each batch of tries it looks back at every step it took. If the rest of that try went better than tries from that square usually go, the step gets a little more likely; if worse, a little less. “Usually” is a running average it keeps for every square.",
    wild: "A nudge that is far too big pushes a habit all the way at once. After one unlucky batch a square can be stuck on one move for good: it never tries anything else, so it can never find out that something else is better.",
    batch:
      "More tries per nudge means each nudge is based on more evidence, so it is steadier, but with the same number of tries there are fewer nudges.",
    maths: "The maths",
    formula:
      "For every step: number for that move += nudge size × (what the rest of the try earned − the usual from that square) × (1 − its chance); every other move’s number goes the other way by its own chance. Steps are averaged over the batch. Chances are the softmax of the four numbers.",
  },
};

export const missionWords = {
  goal: "Nudge so hard it goes wild",
  hint: "Turn “How hard each nudge” all the way up, then let it practise.",
  success:
    "With enormous nudges, one unlucky batch shoved its habits all the way to one move. Now it does the same thing every time, so it never tries the way that would work.",
};

export const predictionWords = {
  question:
    "Early on, the puppy reaches its bowl by luck. At the next nudge, what happens to the moves it made on that lucky try?",
  more: "They get more likely",
  less: "They get less likely",
  same: "Nothing: one lucky try isn’t enough",
};

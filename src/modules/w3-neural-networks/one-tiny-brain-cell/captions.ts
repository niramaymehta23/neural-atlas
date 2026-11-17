// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { VoiceId } from "./model";

export const captions = {
  opening:
    "A friend is deciding whether to go to the park. They listen to three things: is it sunny, is it the weekend, are friends going? Some of those matter to them more than others.",
  story:
    "The cell adds up the voices saying yes, counting the ones it trusts more as bigger. If the total beats how hard it is to convince, it says yes.",
  compare: {
    label: "Compare your cell with one that trusts every voice the same",
    leftLabel: "Your cell",
    rightLabel: "Trusts all the same",
  },
};

const VOICE_NAMES: Record<VoiceId, string> = {
  sun: "It’s sunny",
  weekend: "It’s the weekend",
  friends: "Friends are going",
};

export const words = {
  voices: VOICE_NAMES,
  strings: {
    label: "Three voices tied to one cell by strings: thicker strings are trusted more",
    instructions:
      "Each string has a knob in its middle. Pull it up to trust that voice more, down to push against it. On a phone, hold the knob a moment, then drag. With the keyboard, use the arrow keys.",
    string: (voice: string) => `How much it trusts “${voice}”`,
    pull: (weight: number) =>
      weight > 1.5
        ? "trusts it a lot"
        : weight > 0.2
          ? "trusts it a little"
          : weight >= -0.2
            ? "ignores it"
            : weight >= -1.5
              ? "pushes against it a little"
              : "pushes against it a lot",
    voice: (voice: string, on: boolean) => `${voice}: ${on ? "says yes" : "stays quiet"}`,
  },
  says: {
    yes: "Let’s go to the park!",
    no: "Let’s stay home.",
  },
  sure: {
    very: "very sure",
    quite: "quite sure",
    unsure: "not sure at all",
  },
  cell: (answer: string, sure: string) => `The cell says: ${answer} (${sure})`,
  days: {
    title: "Every possible day",
    note: "Each row is one mix of the voices. A filled dot means that voice says yes.",
    yes: "Go",
    no: "Stay",
  },
  convince: {
    label: "How hard it is to convince",
    easy: "easy to convince",
    medium: "needs some convincing",
    hard: "very hard to convince",
  },
  firmness: {
    label: "How firmly it decides",
    soft: "wobbly",
    medium: "fairly firm",
    firm: "very firm",
  },
  describe: {
    says: (answer: string, sure: string, voices: string) =>
      `The cell says ${answer}, ${sure}. Saying yes: ${voices}.`,
    yes: "go",
    no: "stay home",
    nobody: "nobody",
  },
  drawer: {
    mechanics: "What the cell does",
    adds: "For each voice saying yes, the cell adds how much it trusts that voice. Voices it pushes against take some away. Then it takes away how hard it is to convince.",
    decides:
      "If what is left is above zero it leans to yes, below zero to no. How firmly it decides sets how quickly it goes from unsure to very sure as the total moves away from zero.",
    maths: "The maths",
    formula:
      "total = trust₁ × voice₁ + trust₂ × voice₂ + trust₃ × voice₃ − how hard to convince. chance of yes = 1 ÷ (1 + e^(−firmness × total)).",
  },
};

export const missionWords = {
  goal: "Make it never say yes",
  hint: "Try pushing against every voice, or make it very hard to convince.",
  success:
    "Even with every voice it trusts saying yes, the total can’t beat how hard it is to convince. A cell like that ignores the world: it says no to everything.",
};

export const predictionWords = {
  question:
    "Start with the cell as it first appears. The sun stays away, but it’s the weekend and friends are going. Will it go?",
  yes: "Yes, it goes",
  no: "No, it stays home",
};

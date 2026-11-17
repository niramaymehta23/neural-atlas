// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { Brush } from "./model";

export const captions = {
  opening:
    "A machine starts with a square of pure fog. At every step it guesses the face hidden in the fog and clears a little of the fog away. Choose how many steps it takes, then let it clear.",
  story:
    "Each small step only has to make the picture a little less foggy, so the machine can settle on one crisp face. Squeeze it into one or two giant steps and it can only guess the blurry middle of every face it knows.",
  compare: {
    label: "Compare your number of steps with the other end of the dial",
    leftLabel: "Your steps",
    rightLabel: "The other end",
  },
};

const BRUSH_NAMES: Record<Brush, string> = {
  ink: "Paint dark",
  paper: "Paint light",
  rub: "Rub out",
};

export const words = {
  cleanings: {
    label: "How many cleaning steps",
    one: "one giant step",
    many: (count: string) => `${count} steps`,
  },
  fog: {
    label: "Which fog to start from",
    number: (count: string) => `fog number ${count}`,
  },
  brush: { label: "Brush", names: BRUSH_NAMES },
  clear: "Clear the fog",
  again: "Clear it again",
  working: "Clearing…",
  rubAll: "Rub out all my paint",
  picture: {
    label:
      "The picture in the fog. Drag to paint where it should be dark or light, or use the arrow keys and press Enter to paint.",
    kind: "painting",
    caption: "Paint where you want dark or light, and the face will grow to fit.",
  },
  key: { ink: "Painted dark", paper: "Painted light", cursor: "Where Enter paints" },
  verdict: {
    waiting: "Tap “Clear the fog” to watch the face appear.",
    working: "Clearing the fog…",
    face: "A clear face came out of the fog.",
    mush: "Grey mush: too few steps to find any one face.",
  },
  model: {
    loading: "Fetching the fog cleaner…",
    failed: "The fog cleaner couldn’t be fetched. Check your connection, then try again.",
    retry: "Try again",
  },
  describe: {
    loading: "The fog cleaner is on its way.",
    waiting: (steps: string) => `Fog waiting to be cleared in ${steps}.`,
    working: "The fog is being cleared.",
    done: (steps: string, how: string) => `After ${steps}: ${how}`,
  },
  drawer: {
    mechanics: "How it clears the fog",
    practice:
      "While it practised, it was shown faces with fog mixed in — sometimes a little, sometimes so much the face was gone — and had to guess the clear face underneath.",
    steps:
      "To make a new face, it starts from fog alone. At each step it guesses the clear face, then mixes its guess back with a little less fog than before. Early guesses are blurry, but each one gives the next step more to go on.",
    giant:
      "In one giant step it has to guess straight from pure fog, where any face is possible, so its best guess is the blur in the middle of them all.",
    paint:
      "Painted pixels are put back at every step, with the right amount of fog for that step, so the rest of the face has to agree with your paint.",
    maths: "The maths",
    formula:
      "foggy = √k · face + √(1 − k) · fog, where k goes from almost 0 (all fog) to 1 (no fog) over 200 steps. Each step: guess = cleaner(foggy, step); the fog part is worked out from the guess, and the next picture uses the next k (diffusion, cleaned with DDIM steps).",
  },
};

export const missionWords = {
  goal: "Skip most of the steps and get mush",
  hint: "Turn “How many cleaning steps” right down, then clear the fog.",
  success:
    "With one or two giant steps, the machine had to guess the whole face straight from fog. Any face could be hiding there, so its safest guess was the grey blur in the middle of all of them.",
};

export const predictionWords = {
  question: "If the machine clears all the fog in one giant step, what will come out?",
  face: "A clear face",
  mush: "A grey blur",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { Ready } from "./model";

export const captions = {
  opening:
    "Draw any squiggle you like. A row of little cells will practise copying it. Each cell can only make one gentle bend, so how many cells do you need?",
  story:
    "One cell can make one bend. Put enough cells side by side and their bends add up to any shape at all, as long as they practise for long enough.",
  compare: {
    label: "Compare your cells with just one cell",
    leftLabel: "Your cells",
    rightLabel: "One cell",
  },
};

const READY_LABELS: Record<Ready, string> = {
  wave: "A wave",
  zigzag: "A zigzag",
  steps: "Some steps",
};

const HEIGHT_WORDS = ["very low", "low", "the middle", "high", "very high"] as const;

export const words = {
  draw: {
    label: "Your squiggle",
    instructions:
      "Use left and right to pick a spot along the squiggle, and up and down to move it higher or lower. With a finger, hold still for a moment, then draw.",
    /** Read out for the spot the keyboard is on, such as "Spot 3 of 32: high". */
    spot: (spot: string, of: string, height: string) => `Spot ${spot} of ${of}: ${height}`,
    height: (value: number) =>
      HEIGHT_WORDS[Math.min(4, Math.max(0, Math.round((value + 1) * 2)))] ?? HEIGHT_WORDS[2],
  },
  ready: {
    label: "Or use a ready squiggle",
    names: READY_LABELS,
    flat: "Rub it out",
  },
  cells: {
    label: "How many cells",
    one: "one cell",
    many: (count: string) => `${count} cells`,
  },
  practice: {
    label: "How long it practises",
    short: "a short go",
    medium: "a good while",
    long: "a long time",
  },
  practise: "Let it practise",
  again: "Practise again",
  working: "Practising…",
  picture: "Your squiggle, and the line the cells draw now",
  key: {
    squiggle: "Your squiggle",
    line: "What the cells draw",
  },
  howClose: {
    waiting: "Press “Let it practise” to watch the cells try.",
    close: "The line follows your squiggle.",
    near: "The line is near your squiggle, but misses some bends.",
    far: "The line is still far off your squiggle.",
  },
  describe: {
    waiting: (cells: string) => `${cells} waiting to copy your squiggle.`,
    working: "The cells are practising.",
    done: (cells: string, how: string) => `${cells}: ${how}`,
  },
  drawer: {
    mechanics: "What the cells do",
    cells:
      "Each cell takes the spot along the line, multiplies it by its own amount, adds a nudge and bends the result into a gentle S. The answer is a mix of every cell’s S.",
    enough:
      "Each S can be moved, stretched and flipped, so enough of them added together can follow any smooth squiggle. A sharp zigzag needs more cells and more practice than a gentle wave.",
    few: "With only one or two cells there are only one or two bends to work with, so a squiggle with many bumps stays out of reach however long they practise.",
    maths: "The maths",
    formula:
      "answer(x) = Σ outᵢ × tanh(inᵢ × x + nudgeᵢ) + nudge. Practice lowers the average of (answer − height)² over the 32 spots, using Adam steps.",
  },
};

export const missionWords = {
  goal: "Give the cells a squiggle too bumpy for them",
  hint: "Turn “How many cells” right down to one or two, keep a bumpy squiggle, then let it practise.",
  success:
    "However long they practise, one or two cells only have one or two bends to work with, so they can’t follow every bump.",
};

export const predictionWords = {
  question: "With twenty cells and a good long practice, can they copy a sharp zigzag?",
  yes: "Yes, closely",
  no: "No, it’s too sharp",
};

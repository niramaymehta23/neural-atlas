// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A sorter looks at flowers and says which kind each one is. It never just says “daisy”: it says “daisy, and I’m this sure”. Some flowers are easy to tell; some sit right where the two kinds mix.",
  story:
    "Far from the fence it is sure; near the fence it should be unsure. Turn it boastful and it sounds certain everywhere, even about the flowers it gets wrong.",
  compare: {
    label: "Compare your sorter with a cautious one",
    leftLabel: "Your sorter",
    rightLabel: "A cautious sorter",
  },
};

export const words = {
  field:
    "The field of flowers, shaded by which kind the sorter thinks grows there; stronger shade means more sure",
  picked: "Five flowers to look at closely",
  letters: ["A", "B", "C", "D", "E"],
  flowers: ["daisy", "tulip"],
  guess: (letter: string, flower: string) => `${letter}: it says ${flower}`,
  sure: (share: string) => `${share} sure`,
  wrong: (flower: string) => `wrong, it’s really a ${flower}`,
  barLabel: (letter: string) => `How sure it is about flower ${letter}`,
  lens: {
    label: "Magnifying glass",
    instructions:
      "Drag the magnifying glass over the flowers, or use the arrow keys. Rings show how sure the sorter is about each flower: wide rings are sure, small dotted rings are unsure.",
    readout: (inside: string, sure: string) =>
      `Inside the glass: ${inside}. The sorter is sure about ${sure} of them.`,
    flowers: (count: string, one: boolean) => (one ? "one flower" : `${count} flowers`),
    empty: "Inside the glass: no flowers.",
  },
  boast: {
    label: "How sure it lets itself be",
    cautious: "cautious",
    fair: "fair",
    bold: "bold",
    boastful: "boastful",
  },
  overlap: {
    label: "How much the groups overlap",
    apart: "well apart",
    some: "mixing a little",
    lots: "mixed up a lot",
  },
  certainWrong: "It is completely sure about a flower it got wrong.",
  describe: (lens: string, wrong: string) => (wrong ? `${lens} ${wrong}` : lens),
  drawer: {
    mechanics: "Where the sureness comes from",
    score:
      "The sorter is one straight fence. Each flower gets a score: how far it is from the fence, on one side or the other. Far away means a big score.",
    chance:
      "The score is squashed into a chance between nothing and certain. “How sure it lets itself be” multiplies the score first: bigger scores squash closer to certain.",
    maths: "The maths",
    formula:
      "chance of tulip = 1 ÷ (1 + e^−(boast × score)), with score = weight × across + weight × up + start. The guess is the more likely kind; its sureness is the bigger of the chance and one minus it.",
  },
};

export const missionWords = {
  goal: "Make it 100% sure and wrong",
  hint: "Mix the groups up and turn “How sure it lets itself be” all the way up.",
  success:
    "A boastful sorter turns even a small score into “certain”. Where the kinds mix, some flowers sit on the wrong side of the fence, and it is just as certain about those.",
};

export const predictionWords = {
  question: "For a flower right at the border between the two kinds, how sure will the sorter be?",
  sure: "Very sure",
  unsure: "Unsure",
};

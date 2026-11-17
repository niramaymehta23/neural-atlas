// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A machine wants to guess what houses cost. It can’t see the houses: it only knows the facts you tell it about each one.",
  story:
    "The machine finds how much each fact you told it should count, from the houses it has seen. A fact you hide is a fact it can never use, however clever it is.",
  compare: {
    label: "Compare with telling it every fact",
    leftLabel: "The facts you chose",
    rightLabel: "Every fact",
  },
};

export const words = {
  facts: {
    size: "Size",
    rooms: "Rooms",
    garden: "Garden",
    distance: "Distance to town",
    door: "Door colour",
  },
  factNotes: {
    size: "How big the house is.",
    rooms: "How many rooms it has.",
    garden: "How big its garden is.",
    distance: "How far it is from town.",
    door: "What colour its front door is.",
  },
  strings: {
    label:
      "The facts tied to the price guesser: thicker strings count for more; dashed strings bring the price down",
    instructions: "Tap a fact to tell the machine about it, or to hide it.",
    string: (fact: string) => `How much ${fact} counts`,
    pull: (weight: number) =>
      Math.abs(weight) < 0.15
        ? "hardly counts"
        : weight > 0
          ? weight > 2
            ? "pushes the price up a lot"
            : "pushes the price up a little"
          : weight < -2
            ? "brings the price down a lot"
            : "brings the price down a little",
    voice: (fact: string, on: boolean) => (on ? `${fact}: told` : `${fact}: hidden`),
    cell: "The price guesser adds up the facts it is told, each pulled by its own string. Tap a fact to tell it or hide it.",
  },
  newHouses: "Its guesses for new houses",
  house: (number: string) => `House ${number}`,
  real: "Real price",
  guess: "Its guess",
  close: {
    close: "spot on",
    little: "a little off",
    far: "far off",
  },
  overall: {
    close: "Its guesses are spot on.",
    little: "Its guesses are a little off.",
    far: "Its guesses are far off.",
  },
  key: "Solid bar: the real price. Dashed bar: its guess. Longer means pricier.",
  houses: {
    label: "How many houses it learns from",
    few: "a few houses",
    some: "quite a few houses",
    lots: "lots of houses",
  },
  jumpy: {
    label: "How much prices jump about",
    steady: "prices follow the facts",
    some: "prices jump a bit",
    lots: "prices jump a lot",
  },
  describe: {
    told: (facts: string, how: string) => `It is told ${facts}. ${how}`,
    nothing: (how: string) => `It is told nothing about the houses. ${how}`,
    and: " and ",
  },
  drawer: {
    mechanics: "How the guesser works",
    sum: "Its guess is a starting amount plus, for each fact it is told, that fact times its weight. A hidden fact has no weight at all.",
    fit: "It picks the weights that make its guesses for the houses it learns from as close as they can be, all at once.",
    maths: "The maths",
    formula:
      "price ≈ start + w₁ × size + w₂ × rooms + … The weights make the sum of the squared misses on the learning houses as small as possible.",
  },
};

export const missionWords = {
  goal: "Hide the one fact that matters",
  hint: "Which fact changes the price most? Tap it to hide it.",
  success:
    "Without size, the guesser has nothing to tell a big house from a small one, so its guesses go far off. A machine only knows what you describe to it.",
};

export const predictionWords = {
  question: "Which fact matters most for the price?",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Every animal in a zoo has been measured ten different ways. Nobody can picture ten directions at once, so let’s draw a flat map where animals that are alike end up close together.",
  story:
    "Each dot keeps pulling towards the dots that were its close neighbours in the ten measurements, and pushing away from the rest, until the map settles. Alike things land in islands. But the map makes islands so eagerly that it can find them even where there are none.",
  compare: {
    label: "Compare with each dot listening to just two neighbours",
    leftLabel: "Your map",
    rightLabel: "Two neighbours",
  },
};

export const words = {
  map: "The map: every dot is one thing; dots that land close together were alike",
  data: { label: "What to map", zoo: "A zoo of three kinds of animal", noise: "Random noise" },
  count: { label: "How many things", describe: (count: string) => `${count} things` },
  perplexity: {
    label: "How many neighbours each dot listens to",
    few: "just its closest few",
    some: "a small crowd",
    many: "a big crowd",
  },
  settle: "Let it settle",
  pause: "Pause",
  again: "Start from a new jumble",
  status: {
    jumble: "A jumble: every dot starts near the middle.",
    pulling: "Pulling neighbours together…",
    settling: "Settling…",
    settled: "Settled.",
  },
  progress: "How far the map has settled",
  legend: {
    zoo: "Each shape is one kind of animal. The map was never told which is which.",
    noise: "Every dot is random: there are no real groups here at all.",
  },
  describe: (data: string, status: string) => `${data}. ${status}`,
  drawer: {
    mechanics: "How the map is drawn",
    neighbours:
      "First, for every thing, it works out which other things are its close neighbours in all ten measurements.",
    pull: "Then it scatters the dots on a flat page and nudges them, step after step: neighbours pull together, everything else gently pushes apart.",
    early:
      "For the first part, neighbours pull extra hard, so loose islands form early, then the map tidies up.",
    careful:
      "Distances between islands, and the size of an island, mean very little. And with only a few neighbours each, the map will happily make islands out of noise.",
    maths: "The maths",
    formula:
      "For each pair it sets a chance p (from a bell curve in the ten measurements, widened until each point has about “perplexity” neighbours) and a chance q on the page (from a 1 ÷ (1 + distance²) curve). It moves the dots downhill on KL(P‖Q) = Σ p log(p ÷ q).",
  },
};

export const missionWords = {
  fakeIslands: {
    goal: "Get the map to draw islands out of pure noise",
    hint: "Pick random noise, turn the neighbours right down, and let it settle all the way.",
    success:
      "There are no groups in noise, yet the map drew islands. Listening to only a couple of neighbours, every small chance huddle gets pulled into an island. Islands on a map like this are a hint to check, not proof.",
  },
};

export const predictionWords = {
  question:
    "Random noise, with each dot listening to only its closest two or three. Once it settles, will the map show islands?",
  islands: "Yes, islands",
  even: "No, an even spread",
};

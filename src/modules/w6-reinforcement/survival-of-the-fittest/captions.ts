// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "Little toy cars set off round a racetrack. Each one has three feelers that sense the edge of the road, and a tiny brain that decides how to steer. Nobody teaches them to drive. Draw a track, or pick a ready-made one, and let them race.",
  story:
    "The cars that get furthest become the parents of the next race. Their children are copies with small random changes. Most changes make things worse, but now and then one makes a better driver, and that one gets to be a parent next time.",
  compare: {
    label: "Compare your cars with cars whose children change by a very different amount",
    leftLabel: "Your cars",
    rightLabel: "Other amount of change",
  },
};

export const words = {
  board:
    "The racetrack: road squares are plain, grass squares have tufts, and the cars start on the striped line heading right. The best car is solid, with its path drawn; the others are outlined, and a cross marks where one ran off the road. Tap a square to paint it, or press, hold and drag to paint several.",
  paint: {
    instructions:
      "Arrow keys move around the track; Enter or Space paints the square with the chosen brush.",
    square: (row: string, column: string, kind: string) => `Row ${row}, square ${column}: ${kind}`,
    road: "road",
    grass: "grass",
    start: "the start line",
  },
  brush: { label: "Paint with", road: "Road", grass: "Grass" },
  tracks: {
    label: "Ready-made tracks",
    steps: "Steps",
    loop: "Big loop",
    twisty: "Twisty",
  },
  noWay:
    "This track has no way round. The road has to leave the start line to the right and come back to it from the left.",
  change: {
    label: "How much each child changes",
    copies: "exact copies of their parents",
    tiny: "tiny changes",
    small: "small changes",
    big: "big changes",
    wild: "nearly brand-new random cars",
  },
  carsDial: {
    label: "Cars in each race",
    many: (cars: string) => `${cars} cars in every race`,
  },
  start: "Start the races",
  again: "Race again",
  working: "Racing…",
  another: "New cars",
  waiting: "Tap “Start the races” to watch the cars learn to drive.",
  generation: (generation: number, races: number) =>
    `Race ${count(generation + 1)} of ${count(races)}.`,
  furthest: (squares: number) =>
    squares === 1
      ? "The best car got one square along the road."
      : `The best car got ${count(squares)} squares along the road.`,
  first: (squares: number) =>
    squares === 1
      ? "In the first race, the best got one square."
      : `In the first race, the best got ${count(squares)} squares.`,
  laps: (laps: number) =>
    laps === 1
      ? "That’s once round the whole track."
      : `That’s ${count(laps)} times round the whole track.`,
  crashed: (crashed: number, cars: number) =>
    `${sentenceStart(count(crashed))} of the ${count(cars)} cars ran off the road.`,
  stuck: "Nothing has improved: the best car gets no further than in the first race.",
  chart: "How far the best car of each race got, from the first race to the last",
  chartNote: "Higher is better.",
  describe: {
    waiting: "The cars are waiting on the start line.",
    working: "The cars are racing.",
    done: (furthest: string) => `The races are over. ${furthest}`,
  },
  drawer: {
    mechanics: "How the cars learn",
    brains:
      "Each car’s three feelers measure how far the road goes ahead-left, straight ahead and ahead-right. Its brain is a tiny network of 21 numbers that turns those three distances into how hard to steer. The cars all drive at the same speed.",
    races:
      "In every race each car drives until it leaves the road or its time runs out. Its score is how many road squares it got along the track, in order.",
    breeding:
      "The best quarter of the cars become parents. Every car in the next race is a child of one of them: its parent’s numbers blended with a few brand-new random ones. “How much each child changes” is how much new randomness goes in.",
    wild: "If children change too much, they are hardly like their parents at all, so nothing good is passed on: every race starts again from scratch. If they don’t change at all, nothing new is ever tried.",
    maths: "The maths",
    formula:
      "child number = √(1 − c²) × parent number + c × new random number, where c is the change (0 to 1). No slopes or gradients: only trying, keeping the best, and changing them a little.",
  },
};

export const missionWords = {
  goal: "Mutate so much nothing improves",
  hint: "Turn “How much each child changes” all the way up, then start the races.",
  success:
    "With children that are nearly brand-new random cars, nothing the best drivers learned was passed on. Every race started from scratch, so the best car never got much further than in the first race.",
};

export const predictionWords = {
  question:
    "Make every child an exact copy of its parent. Will the best car drive further as the races go by?",
  better: "Yes, a bit further each race",
  same: "No, it stays just as good",
};

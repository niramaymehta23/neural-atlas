// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "Each dot is a day at a lemonade stand: how hot it was, and how many cups were sold. Draw one straight line that passes as close to all the dots as it can.",
  story:
    "Each little bar is how far one dot misses your line. The best line is the one that makes all the misses, taken together, as small as they can be.",
  compare: {
    label: "Compare with the best line for the first dots only",
    leftLabel: "With your dots",
    rightLabel: "Without your dots",
  },
};

export const words = {
  field: "Dots: tap or drag to add your own",
  paint: {
    instructions:
      "Arrow keys move a ring around the field; Enter or Space adds a dot there. Tab reaches the two round handles that hold the line.",
    position: (across: string, up: string) => `${across}% across, ${up}% up`,
    planted: (across: string, up: string) => `Added a dot at ${across}% across, ${up}% up`,
  },
  handles: {
    left: "Left end of the line",
    right: "Right end of the line",
    instructions:
      "Drag a handle up or down to move that end of the line (on a phone, hold it a moment first), or use the arrow keys.",
    height: (percent: string) => `${percent}% of the way up`,
  },
  key: "Circles: the first dots. Triangles: dots you added. Thin bars: how far each dot misses the line.",
  totalMiss: "How far off, all together",
  totalMissLabel: (how: string) => `How far off the line is, all together: ${how}`,
  missWords: {
    tiny: "hardly at all",
    some: "a bit",
    lots: "a lot",
  },
  showing: {
    yours: "This is your line.",
    walking: "It is walking from your line towards the best one.",
    best: "This is the best line for these dots.",
  },
  full: "That’s plenty of your own dots. Take some away to add more.",
  find: "Let it find the best line",
  again: "Find it again",
  clear: "Take my dots away",
  spread: {
    label: "How spread out the dots are",
    tight: "close to a line",
    some: "a bit spread out",
    lots: "very spread out",
  },
  dots: {
    label: "How many dots",
    few: "a few dots",
    some: "quite a few dots",
    lots: "lots of dots",
  },
  describe: {
    line: (miss: string) => `Your line misses the dots ${miss}.`,
    walking: "The line is walking towards the best place.",
    best: (miss: string, added: string) =>
      `The best line misses the dots ${miss}. You added ${added}.`,
    addedDots: (count: string, one: boolean) => (one ? "one dot" : `${count} dots`),
    none: "no dots of your own",
  },
  drawer: {
    mechanics: "How it finds the best line",
    misses:
      "For every dot it measures the miss: how far the dot is above or below the line. It squares each miss (so big misses count for a lot more) and averages them.",
    walk: "Then it nudges the line’s tilt and height a little, in the direction that makes that average smaller, again and again, until nudging doesn’t help.",
    maths: "The maths",
    formula:
      "line: y = tilt × x + height. Average squared miss = (1/n) Σ (tilt × x + height − y)². Each step: tilt −= step × slope of that average for tilt, and the same for height.",
  },
};

export const missionWords = {
  goal: "Add one crazy dot and watch the best line tilt",
  hint: "Tap far below the line at one end of the field, then let it find the best line.",
  success:
    "One dot far from the rest has a huge miss, and the best line counts big misses extra hard, so it tilts towards that dot. A single silly measurement can pull the whole answer off.",
};

export const predictionWords = {
  question: "You add one dot far away from the rest. What will the best line do?",
  barely: "Barely move",
  tilt: "Tilt towards it",
};

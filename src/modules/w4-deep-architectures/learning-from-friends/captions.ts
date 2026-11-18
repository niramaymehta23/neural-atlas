// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.

export const captions = {
  opening:
    "Sixteen friends belong to two clubs, the Triangles and the Squares, but only four of them wear a club badge. Everyone else has to work out their club from their friends. Pass messages round the network and watch what spreads.",
  story:
    "Each round, everyone listens to their friends and moves a little towards what they think. A few rounds carry the badges' clubs through each group. Keep going, and the views from both groups blend until nobody can tell the clubs apart.",
  compare: {
    label: "Compare your rounds with a very different number of rounds",
    leftLabel: "Your rounds",
    rightLabel: "Other rounds",
  },
};

export const words = {
  listen: {
    label: "How much they listen to friends",
    none: "not at all",
    little: "a little",
    lot: "a lot",
    only: "only to friends",
  },
  rounds: {
    label: "How many rounds",
    none: "no rounds yet",
    one: "one round",
    many: (count: string) => `${count} rounds`,
  },
  pass: "Pass messages once",
  restart: "Start again",
  picture:
    "The friendship network: two groups of friends, linked by a few friendships across. Badge wearers have a double ring.",
  key: {
    badge: "Wears the badge",
    triangle: "Thinks: the Triangles",
    square: "Thinks: the Squares",
    unsure: "No idea yet",
  },
  right: (right: string, all: string) =>
    `${right} of the ${all} friends without a badge think they are in their own club.`,
  start: "Nobody without a badge knows their club yet.",
  same: "Everyone now thinks exactly the same, so nobody can tell the two clubs apart.",
  apart: "The two groups still think differently.",
  close: "The two groups are starting to blend together.",
  describe: (rounds: string, right: string, how: string) => `After ${rounds}: ${right} ${how}`,
  drawer: {
    mechanics: "What happens each round",
    mixing:
      "Each friend keeps part of their own view and takes the rest from the average of their friends' views. “How much they listen” sets how big that part is.",
    spreading:
      "In the first few rounds, the badge wearers' views travel along friendships, so people in the same group lean the same way.",
    blending:
      "Because a few friendships cross between the groups, the views keep leaking across. After many rounds, everyone ends up with the same average view and the groups can no longer be told apart. This is called over-smoothing.",
    maths: "The maths",
    formula:
      "new view = (1 − listen) × own view + listen × average of friends' views. A badge starts at +1 or −1; everyone else starts at 0.",
  },
};

export const missionWords = {
  goal: "Pass messages until everyone is identical",
  hint: "Turn “How many rounds” right up.",
  success:
    "Round after round, views leaked along the friendships between the groups until every friend held the same view. Nobody can tell the clubs apart any more.",
};

export const predictionWords = {
  question:
    "After just three rounds, how many friends without a badge will lean towards their own club?",
  most: "Most of them",
  few: "Hardly any",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.

export const captions = {
  opening:
    "A machine has put every face it has seen on a map, and it can draw the face at any spot. Move the marker to glide across the map and watch the faces slowly change.",
  story:
    "Kept tidy, the faces spread evenly over the map with no gaps, so every spot in between is still a face you could believe. Left untidy, they bunch up in places, and in the empty corners it can only draw nonsense.",
  compare: {
    label: "Compare your map with the other end of the tidy dial",
    leftLabel: "Your map",
    rightLabel: "The other end",
  },
};

export const words = {
  tidy: {
    label: "How tidy the map is kept",
    names: ["not at all", "a little", "fully"] as const,
  },
  across: {
    label: "How many faces across",
    many: (count: string) => `${count} faces across`,
  },
  map: {
    label: "Map of faces. Tap a spot, or use the arrow keys to move the marker.",
    kind: "map",
    dots: "Where real faces landed",
    marker: "Your spot",
  },
  picture: {
    label: "The face the machine draws at your spot",
    caption: "The face at your spot",
  },
  verdict: {
    face: "A face you could believe.",
    nonsense: "Nonsense: no real face looks like this.",
  },
  hint: "Each little picture is the face drawn at that place on the map.",
  model: {
    loading: "Fetching the map…",
    failed: "The map couldn’t be fetched. Check your connection, then try again.",
    retry: "Try again",
  },
  describe: {
    loading: "The map is on its way.",
    face: (tidy: string) =>
      `A map kept tidy ${tidy}. The spot under the marker is a believable face.`,
    nonsense: (tidy: string) => `A map kept tidy ${tidy}. The spot under the marker is nonsense.`,
  },
  drawer: {
    mechanics: "How the map is made",
    squeeze:
      "It is a squeezer like the last lesson’s, but squeezing every face down to just two numbers. Two numbers are a spot on a flat map, so every face gets a place.",
    tidy: "Keeping it tidy means two things while it practises: each face gets a fuzzy spot rather than an exact point, and all the spots are gently pulled towards the middle. The fuzz forces nearby spots to mean nearby faces, and the pull stops faces leaving gaps.",
    untidy:
      "With no tidying, it may put faces anywhere that helps it rebuild them. They bunch up, and nothing tells it what to draw in the empty places between.",
    maths: "The maths",
    formula:
      "Practice cost = rebuild mistake + tidy × KL(spot spread ‖ normal). Tidy is 0, 0.1 and 1 on the three stops. The spot spread is a normal with a learned middle and width (a variational autoencoder, VAE).",
  },
};

export const missionWords = {
  goal: "Tear the map, so a gap makes nonsense",
  hint: "Turn “How tidy the map is kept” to “not at all”, then hunt near the edge where no real faces landed.",
  success:
    "With no tidying, the faces bunched together and left empty places. The machine never practised drawing anything there, so a spot in the gap gives a face that makes no sense.",
};

export const predictionWords = {
  question: "If the map is not kept tidy at all, will every spot on it still be a face?",
  yes: "Yes, every spot",
  no: "No, some spots are nonsense",
};

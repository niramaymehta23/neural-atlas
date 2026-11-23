/** Words the experiences share: the sandbox, journeys, museum, theatre and two-player games. */
export const shellCaptions = {
  loading: "Setting the scene…",
  lessonLoading: "Fetching this idea…",
  lessonFailed: "This idea couldn’t load. Check the connection, then try again.",
  openLesson: (title: string) => `Open the whole lesson: ${title}`,
  play: "Start practising",
  replay: "Practise again",
  pause: "Pause",
  again: "Start over",
  card: {
    close: "Close the card",
    loading: "Finding the card…",
    failed: "The card couldn’t load. Check the connection, then try again.",
  },
  workerFailed: "The practice stopped because something went wrong. Start over to try once more.",
};

/** The pages themselves, as the hub, the search box and the page titles name them. */
export const pages = {
  explore: {
    path: "/explore",
    title: "More to do",
    opening:
      "Once the ideas make sense, put them to work: mix them, follow them, race them, or just watch them think.",
  },
  sandbox: {
    path: "/sandbox",
    title: "The sandbox",
    opening:
      "Pick somewhere to learn and something to learn it, in any pair you like. Then press start and watch it learn.",
    card: "Pair any kind of learner with any garden of dots or any board, and watch it learn.",
  },
  journeys: {
    path: "/journeys",
    title: "Guided journeys",
    opening:
      "A journey joins a few ideas into one story, one stop at a time. Every stop is yours to play with.",
    card: "Follow a story through the ideas, such as how a chatbot answers you, from start to end.",
  },
  museum: {
    path: "/museum",
    title: "The museum of thinking machines",
    opening:
      "Walk through the years, from the first machine that could learn to the chatbots of today. Every room has something to try.",
    card: "Walk from the first learning machine to today’s chatbots, trying each one on the way.",
  },
  theatre: {
    path: "/theatre",
    title: "The theatre",
    opening: "Sit back and watch a small machine think. Nothing to do here but look.",
    card: "Sit back and watch a machine think, filling the whole screen.",
  },
  twoPlayer: {
    path: "/two-player",
    title: "Two players",
    opening: "Two games for two people sharing one screen. Take turns, and no peeking.",
    card: "Race a friend to train a team, or break a team and dare them to repair it.",
  },
};

/** Every achievement's words. Each is a star of its own on the home map. */
export const achievementCaptions = {
  earned: (title: string) => `You earned a star: ${title}.`,
  onMap: "See it on the map",
  heading: "Your stars",
  empty: "Nothing here yet. Finish anything below and a star joins the map.",
  locked: (title: string) => `Not yet: ${title}`,
  has: (title: string) => `Earned: ${title}`,
  world: (title: string) => ({
    title: `All of ${title}`,
    how: `Learn every idea in “${title}”.`,
  }),
  list: {
    "first-star": { title: "First star", how: "Finish your first mission in any idea." },
    "ten-stars": { title: "Ten stars", how: "Finish ten missions." },
    "sandbox-garden": {
      title: "Gardener",
      how: "Let a learner finish practising on a garden in the sandbox.",
    },
    "sandbox-board": {
      title: "Board walker",
      how: "Let a learner finish practising on a board in the sandbox.",
    },
    journey: { title: "Traveller", how: "Reach the last stop of a journey." },
    museum: { title: "Museum visitor", how: "Try five rooms in the museum." },
    theatre: { title: "Quiet watcher", how: "Watch the theatre for a whole minute." },
    race: { title: "Racer", how: "Finish a race between two players." },
    mend: { title: "Breaker and fixer", how: "Finish a round of break and repair." },
    sound: { title: "Listener", how: "Listen to a learner learning." },
    words: { title: "Word collector", how: "Open three word cards." },
  },
};

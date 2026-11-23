/** Every word of the theatre. */
export const theatreCaptions = {
  programme: {
    label: "What to watch",
    turns: "One after another",
    words: "Choosing words",
    shapes: "Learning a shape",
    explorer: "Exploring a board",
  },
  pause: "Pause",
  play: "Carry on",
  full: "Fill the screen",
  shrink: "Leave the full screen",
  noFull: "This browser can’t fill the screen, so here is the whole page instead.",
  back: "Back to more to do",
  keys: "Space pauses. Move or tap to bring the controls back.",
  failed: "The storyteller couldn’t be fetched. The other shows still play.",
  loading: "Dimming the lights…",
  now: {
    words: (story: string) =>
      `The storyteller is choosing one word after another. So far: ${story}`,
    shapes: "A small team is learning to tell two kinds of dots apart.",
    explorer: "An explorer is learning its way to the bowl by trying.",
  },
  under: {
    words: "The longer the bar, the likelier it thinks that word comes next.",
    shapes: "Each thread shifts a little, and the painted guess follows.",
    explorer: "The glow is how good each square looks to it so far.",
  },
};

/** Every learner-facing word in the ui primitives, here so check-captions can read them. */
export const uiCaptions = {
  palette: {
    title: "Find an idea",
    placeholder: "Type an idea, like “rolling downhill”",
    empty: "Nothing by that name yet.",
  },
  mission: {
    label: "Mission",
    done: "Mission done",
    showHint: "Need a hint?",
    hideHint: "Hide the hint",
  },
  termLead: "You just did",
  drawer: "Peek under the hood",
  theme: { label: "Page colour", day: "Day", night: "Night" },
  timeline: {
    back: "Back one moment",
    forward: "Forward one moment",
    play: "Play",
    pause: "Pause",
    track: "Moment",
    empty: "Nothing recorded yet",
    moment: (position: string, length: string) => `Moment ${position} of ${length}`,
  },
  robot: "Robot learner",
};

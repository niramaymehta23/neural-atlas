import type { WorldEntry } from "@/platform/contract";

export const world1: WorldEntry = {
  world: 1,
  title: "Learning from examples",
  lessons: [
    {
      id: "teach-by-showing",
      title: "Teach by showing",
      realTerm: "Machine learning",
      idea: "Show lots of examples instead of writing rules, and it spots the pattern",
      playWith: "Sort fruit yourself; a little robot copies you",
      prerequisites: [],
      load: () =>
        import("@/modules/w1-foundations/teach-by-showing").then(({ definition }) => definition),
    },
    {
      id: "what-the-machine-sees",
      title: "What the machine sees",
      realTerm: "Features",
      idea: "It only knows what you describe to it",
      playWith: "Pick which facts describe a house and watch the price guess change",
      prerequisites: ["teach-by-showing"],
      load: () =>
        import("@/modules/w1-foundations/what-the-machine-sees").then(
          ({ definition }) => definition,
        ),
    },
    {
      id: "drawing-the-best-line",
      title: "Drawing the best line",
      realTerm: "Linear regression",
      idea: "Find the line closest to all the dots",
      playWith: 'Drag a line; little "miss" bars shrink and grow',
      prerequisites: ["what-the-machine-sees"],
      load: () =>
        import("@/modules/w1-foundations/drawing-the-best-line").then(
          ({ definition }) => definition,
        ),
    },
    {
      id: "splitting-into-groups",
      title: "Splitting into groups",
      realTerm: "Classification",
      idea: "Put a fence between two kinds of things",
      playWith: "Paint two colours of dots; a fence appears",
      prerequisites: ["what-the-machine-sees"],
      load: () =>
        import("@/modules/w1-foundations/splitting-into-groups").then(
          ({ definition }) => definition,
        ),
    },
    {
      id: "keeping-score-of-mistakes",
      title: "Keeping score of mistakes",
      realTerm: "Loss function",
      idea: 'One score for "how wrong"',
      playWith: "Compare a gentle and a strict mistake-scorer",
      prerequisites: ["drawing-the-best-line"],
      load: () =>
        import("@/modules/w1-foundations/keeping-score-of-mistakes").then(
          ({ definition }) => definition,
        ),
    },
    {
      id: "rolling-downhill",
      title: "Rolling downhill",
      realTerm: "Gradient descent",
      idea: "Learning is walking downhill in a valley of mistakes",
      playWith: "Balls racing down the valley",
      prerequisites: ["keeping-score-of-mistakes"],
      load: () =>
        import("@/modules/w1-foundations/rolling-downhill").then(({ definition }) => definition),
    },
    {
      id: "memorising-vs-understanding",
      title: "Memorising vs understanding",
      realTerm: "Overfitting",
      idea: "Learning answers by heart fails on new questions",
      playWith: "A student who crammed past papers sits a new exam",
      prerequisites: ["drawing-the-best-line"],
      load: () =>
        import("@/modules/w1-foundations/memorising-vs-understanding").then(
          ({ definition }) => definition,
        ),
    },
    {
      id: "the-surprise-test",
      title: "The surprise test",
      realTerm: "Train / test split",
      idea: "Hide some examples to check it really learned",
      playWith: "Slide how much to hide; see the honest score",
      prerequisites: ["memorising-vs-understanding"],
      load: () =>
        import("@/modules/w1-foundations/the-surprise-test").then(({ definition }) => definition),
    },
    {
      id: "stubborn-vs-jumpy",
      title: "Stubborn vs jumpy",
      realTerm: "Bias and variance",
      idea: "Some learners never change, some change at every example",
      playWith: "A darts board of slightly different robots",
      prerequisites: ["the-surprise-test"],
      load: () =>
        import("@/modules/w1-foundations/stubborn-vs-jumpy").then(({ definition }) => definition),
    },
    {
      id: "how-sure-is-it",
      title: "How sure is it?",
      realTerm: "Confidence and probability",
      idea: "Machines give guesses with a confidence, not facts",
      playWith: "Confidence bars above each guess",
      prerequisites: ["splitting-into-groups"],
      load: () =>
        import("@/modules/w1-foundations/how-sure-is-it").then(({ definition }) => definition),
    },
  ],
};

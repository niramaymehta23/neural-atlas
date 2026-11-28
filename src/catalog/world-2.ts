import type { WorldEntry } from "@/platform/contract";

export const world2: WorldEntry = {
  world: 2,
  title: "Classic tricks",
  lessons: [
    {
      id: "ask-the-neighbours",
      title: "Ask the neighbours",
      realTerm: "k-nearest neighbours",
      idea: "You're probably like the people near you",
      playWith: "Tap a dot; ripples reach the neighbours who vote",
      prerequisites: ["splitting-into-groups"],
      load: () =>
        import("#modules/w2-classic-ml/ask-the-neighbours").then(({ definition }) => definition),
    },
    {
      id: "twenty-questions",
      title: "Twenty questions",
      realTerm: "Decision tree",
      idea: "Ask yes/no questions until you know",
      playWith: "Each question slices the map smaller",
      prerequisites: ["splitting-into-groups"],
      load: () =>
        import("#modules/w2-classic-ml/twenty-questions").then(({ definition }) => definition),
    },
    {
      id: "wisdom-of-the-crowd",
      title: "Wisdom of the crowd",
      realTerm: "Random forest",
      idea: "Many small guessers beat one clever one",
      playWith: "A forest of little trees votes",
      prerequisites: ["twenty-questions", "stubborn-vs-jumpy"],
      load: () =>
        import("#modules/w2-classic-ml/wisdom-of-the-crowd").then(({ definition }) => definition),
    },
    {
      id: "the-mistake-relay",
      title: "The mistake relay",
      realTerm: "Gradient boosting",
      idea: "Each helper fixes what the last got wrong",
      playWith: "Mistakes glow; the next runner chases them",
      prerequisites: ["wisdom-of-the-crowd", "rolling-downhill"],
      load: () =>
        import("#modules/w2-classic-ml/the-mistake-relay").then(({ definition }) => definition),
    },
    {
      id: "the-widest-road",
      title: "The widest road",
      realTerm: "Support vector machine",
      idea: "Separate groups with the widest road; lift tangled dots into the air to split them",
      playWith: 'Widen a road held up by a few "lamp-post" dots',
      prerequisites: ["splitting-into-groups"],
      load: () =>
        import("#modules/w2-classic-ml/the-widest-road").then(({ definition }) => definition),
    },
    {
      id: "the-spam-detective",
      title: "The spam detective",
      realTerm: "Naive Bayes",
      idea: "Add up clues to judge a message",
      playWith: "Words light up as spam or not-spam clues",
      prerequisites: ["how-sure-is-it"],
      load: () =>
        import("#modules/w2-classic-ml/the-spam-detective").then(({ definition }) => definition),
    },
    {
      id: "finding-natural-groups",
      title: "Finding natural groups",
      realTerm: "Clustering (k-means)",
      idea: "Group things that sit close, with no labels",
      playWith: "Magnets pull dots into groups",
      prerequisites: ["what-the-machine-sees"],
      load: () =>
        import("#modules/w2-classic-ml/finding-natural-groups").then(
          ({ definition }) => definition,
        ),
    },
    {
      id: "the-best-shadow",
      title: "The best shadow",
      realTerm: "PCA",
      idea: "Simplify while keeping the shape",
      playWith: "Turn a 3D cloud to find the most useful shadow",
      prerequisites: ["what-the-machine-sees"],
      load: () =>
        import("#modules/w2-classic-ml/the-best-shadow").then(({ definition }) => definition),
    },
    {
      id: "a-map-of-everything",
      title: "A map of everything",
      realTerm: "t-SNE / UMAP",
      idea: "Draw a map where similar things sit together",
      playWith: "A messy cloud settles into islands",
      prerequisites: ["the-best-shadow", "finding-natural-groups"],
      load: () =>
        import("#modules/w2-classic-ml/a-map-of-everything").then(({ definition }) => definition),
    },
    {
      id: "is-99-percent-actually-good",
      title: "Is 99% actually good?",
      realTerm: "Evaluation metrics",
      idea: "A score can lie",
      playWith: "A sorting machine drops guesses into right and wrong boxes",
      prerequisites: ["the-surprise-test", "how-sure-is-it"],
      load: () =>
        import("#modules/w2-classic-ml/is-99-percent-actually-good").then(
          ({ definition }) => definition,
        ),
    },
  ],
};

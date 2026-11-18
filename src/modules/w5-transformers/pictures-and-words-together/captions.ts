// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

const quote = (text: string) => `“${text}”`;

export const captions = {
  opening:
    "Some AI can look at pictures and read words in the same go. It puts both onto one shared map of meaning, so a photo of a cat and the words “a sleepy cat” land close together. Put captions on the photos and see what it thinks.",
  story:
    "It never truly sees a car or a bicycle. It only knows how close a caption's spot on the map is to a photo's. Close enough counts as a match, which is why a caption that is nearly right can fool it.",
  compare: {
    label: "Compare with a stricter matcher",
    leftLabel: "Your matcher",
    rightLabel: "Stricter",
  },
};

/** The photos on show, with what they really show. */
export const PHOTOS = [
  { file: "cat.jpg", kind: "cat", alt: "A cat" },
  { file: "dog.jpg", kind: "dog", alt: "A boxer dog" },
  { file: "bananas.jpg", kind: "bananas", alt: "A bunch of bananas" },
  { file: "teapot.jpg", kind: "teapot", alt: "A china teapot" },
  { file: "bicycle.jpg", kind: "bicycle", alt: "An old bicycle" },
  { file: "flowers-1.jpg", kind: "flowers", alt: "Pink flowers" },
] as const;

/** Captions to place: the right kind for each photo, and three that are nearly right. */
export const CAPTIONS = [
  { text: "a sleepy cat", kind: "cat" },
  { text: "a happy dog", kind: "dog" },
  { text: "a bunch of bananas", kind: "bananas" },
  { text: "a pot of tea", kind: "teapot" },
  { text: "a bike to ride", kind: "bicycle" },
  { text: "pink flowers", kind: "flowers" },
  { text: "a car", kind: "car" },
  { text: "a kettle", kind: "kettle" },
  { text: "a wolf", kind: "wolf" },
] as const;

export const words = {
  captions: "Captions. Tap one to pick it up, then tap a photo to place it. You can also drag it.",
  holding: (text: string) => `Holding ${quote(text)}. Tap a photo to place it.`,
  pickUp: (text: string) => `Pick up the caption ${quote(text)}`,
  placeOn: (alt: string, holding: string | null) =>
    holding ? `Place ${quote(holding)} on the photo: ${alt}` : `Photo: ${alt}`,
  empty: "No caption yet",
  remove: "Take the caption off",
  removeLabel: (alt: string) => `Take the caption off the photo: ${alt}`,
  closeness: (likeness: number) => {
    if (likeness >= 0.8) return "very close";
    if (likeness >= 0.6) return "close";
    if (likeness >= 0.3) return "a bit close";
    return "far apart";
  },
  verdict: (match: boolean) => (match ? "It says: a match" : "It says: not a match"),
  truth: (right: boolean) => (right ? "and that's right" : "but that's wrong"),
  tricks: {
    label: "How many trick captions are in the pile",
    describe: (value: number) =>
      value === 0
        ? "No tricks"
        : value === 1
          ? "One trick"
          : `${sentenceStart(count(value))} tricks`,
  },
  threshold: {
    label: "How close counts as a match",
    describe: (value: number) =>
      value < 0.45
        ? "Anything a bit close"
        : value < 0.7
          ? "Close"
          : value < 0.85
            ? "Very close"
            : "Almost the same spot",
  },
  fooled: "It's been fooled: it called a wrong caption a match.",
  model: {
    loading: "Fetching the shared map of pictures and words…",
    failed: "The map could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  describe: {
    waiting: "The matcher is getting ready.",
    none: "No captions are placed yet.",
    placed: (count: number, fooled: boolean) =>
      `${count} ${count === 1 ? "caption is" : "captions are"} placed.${fooled ? " It has been fooled by a wrong caption." : ""}`,
  },
  drawer: [
    {
      title: "How the shared map works",
      paragraphs: [
        "A picture reader (MobileNet, from World 4) turns each photo into a list of numbers. A word map (GloVe, from “Words as places”) turns a caption into another list. Two small maps, fitted here, carry both onto one shared map.",
        "The fitting showed it photos with captions of their own kind and pulled them together, while pushing mismatched ones apart. It only practised on a few captions per photo, so captions it never saw land wherever their words point.",
        "“A car” never appeared in practice, but its words sit near words about bikes and riding, so it lands near the bicycle.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is a tiny version of CLIP-style contrastive learning: both sides are projected to 32 numbers and scaled to length one, and the fit maximises the softmax probability of each true photo–caption pair against the others (temperature 0.1).",
        "Closeness is cosine similarity on the shared map; the dial sets the threshold for calling a match.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Swap captions to confuse it",
  hint: "Try the captions that are nearly right, like “a car” or “a kettle”, on the photos they're close to.",
  success:
    "A caption that is close in meaning landed close on the map, so it was called a match. The matcher measures closeness, not truth, which is why such AI can be fooled by nearly right words.",
};

export const predictionWords = {
  question: "Put “a car” on the photo of the bicycle. Will it call it a match?",
  yes: "Yes, a match",
  no: "No, not a match",
};

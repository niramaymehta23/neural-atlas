// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { SinglePhoto } from "@/features/inside/use-photo";
import type { Keep } from "./model";

export const captions = {
  opening:
    "Shrink a photo tile by tile: each square of dots becomes one dot. Keep the brightest of each tile, or the average. How small can it get before the AI loses track?",
  story:
    "Shrinking keeps the gist and drops the detail. You can still tell what the photo is long after the fine detail has gone. Inside a picture-reading AI, the maps get shrunk like this between layers, so deeper torches see more of the picture at once.",
  compare: {
    label: "Compare keeping the average with keeping the brightest",
    leftLabel: "Your setting",
    rightLabel: "Other way to keep",
  },
};

const PHOTO_NAMES: Record<SinglePhoto, string> = {
  cat: "Cat",
  dog: "Dog",
  teapot: "Teapot",
  bananas: "Bananas",
  bicycle: "Bike",
};

const KEEP_NAMES: Record<Keep, string> = {
  average: "The average",
  brightest: "The brightest",
};

/** One phrase per shrink, in order: not shrunk … almost nothing left. */
const SHRINKS = [
  "not shrunk",
  "a little smaller",
  "smaller",
  "much smaller",
  "tiny",
  "a few blocks across",
  "very few blocks",
  "almost nothing left",
];

export const words = {
  photos: { label: "Pick a photo", names: PHOTO_NAMES },
  shrink: { label: "How much to shrink", names: SHRINKS },
  keep: { label: "What each tile keeps", names: KEEP_NAMES },
  photo: "The full photo",
  photoTitle: "Photo",
  shrunk: (how: string) => `The photo shrunk: ${how}`,
  shrunkTitle: "Shrunk",
  loading: "Getting the photo…",
  looking: "The AI is looking…",
  says: (name: string) => `The AI says: ${name}.`,
  lost: (now: string, before: string) =>
    `The AI now says ${now}. For the full photo it said ${before}.`,
  ladder: {
    title: "What the AI says at each shrink",
    waiting: "…",
    same: "still the same",
    changed: "changed",
    here: "shown now",
  },
  failed: "The AI could not look at the picture.",
  photoFailed: "The photo would not load.",
  retry: "Try again",
  describe: (photo: string, shrink: string, keep: string) =>
    `${photo}, ${shrink}, each tile keeping ${keep}.`,
  drawer: {
    mechanics: "What shrinking does",
    tiles:
      "The photo is cut into square tiles. Each tile becomes one dot. “The brightest” keeps the strongest of each colour in the tile; “the average” mixes them all together.",
    inside:
      "Inside a picture-reading AI, the finding maps are shrunk the same way between layers, usually keeping the strongest find. The AI keeps what was found and drops exactly where, so the next torches cover more of the picture and there is less to work through.",
    shown:
      "This AI only takes full-size pictures, so it is shown the shrunk picture blown back up smoothly, like a photo seen from across the room.",
    detail:
      "It was trained on big, detailed photos, so it needs more detail than you do to know what it is looking at.",
    maths: "The maths",
    max: "Keeping the brightest (max pooling): out(x, y) = the biggest value in the tile at (x, y).",
    average:
      "Keeping the average (average pooling): out(x, y) = the mean of the values in the tile.",
  },
};

export const missionWords = {
  goal: "Find the smallest picture the AI still knows",
  hint: "Shrink one step at a time and watch the answer. Stop at the last step before it changes.",
  success:
    "That is as small as this photo can get before the AI loses track. You can probably still tell what it is for a few more steps: the gist is still there.",
};

export const predictionWords = {
  question:
    "Shrink the photo until it is just a few blocks across. Will the AI still know what it is?",
  keeps: "Yes, it keeps the gist",
  loses: "No, it loses track",
};

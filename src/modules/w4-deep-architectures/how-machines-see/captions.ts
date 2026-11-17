// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { Stage } from "@/engine/vision/seeing";
import type { SinglePhoto } from "@/features/inside/use-photo";

export const captions = {
  opening:
    "Show a picture-reading AI a photo, or your camera. See what its torches find, layer by layer, and what it thinks it is looking at.",
  story:
    "Each layer sweeps many pattern torches over the maps from the layer before. The first layer finds edges. The middle layers find shapes made of edges. The deep layers find parts, like an eye or a wheel, and the end turns those parts into a name. But it does not see the way you do: a smudge too faint for your eyes can change its answer.",
  compare: {
    label: "Compare the picture with and without the smudge",
    leftLabel: "Your setting",
    rightLabel: "Smudge swapped",
  },
};

const PHOTO_NAMES: Record<SinglePhoto, string> = {
  cat: "Cat",
  dog: "Dog",
  teapot: "Teapot",
  bananas: "Bananas",
  bicycle: "Bike",
};

const DEPTH_NAMES: Record<Stage, string> = {
  edges: "First layer: edges",
  shapes: "Middle: shapes",
  parts: "Deep: parts",
};

const DEPTH_TITLES: Record<Stage, string> = {
  edges: "What six torches in the first layer found",
  shapes: "What six torches in a middle layer found",
  parts: "What six torches in a deep layer found",
};

export const words = {
  photos: {
    label: "Pick a picture",
    names: PHOTO_NAMES,
    snap: "your camera snap",
  },
  camera: {
    use: "Use my camera",
    stop: "Stop the camera",
    ask: {
      title: "Use your camera?",
      body: "The AI looks at the camera picture right here on this device. The picture is never sent anywhere or saved. You can stop it at any time.",
      yes: "Yes, use my camera",
      no: "No thanks",
    },
    states: {
      off: "",
      starting: "Starting the camera…",
      on: "The camera is on. Its picture stays on this device.",
      denied: "The camera is blocked, so use the photos instead.",
      missing: "No camera was found, so use the photos instead.",
      failed: "The camera would not start, so use the photos instead.",
    },
    video: "Your camera picture, as the AI sees it",
  },
  depth: { label: "How deep to look", names: DEPTH_NAMES, titles: DEPTH_TITLES },
  map: (number: number) => `Torch ${number}: dark where it found its pattern`,
  smudge: {
    toggle: "Add a faint smudge",
    strength: "How strong the smudge is",
    tooFaint: "too faint to see",
    faint: "faint",
    visible: "you might just spot it",
    making: "Making the smudge…",
    off: "Turn on the smudge to see it here.",
    title: "The smudge, made much stronger so you can see it",
    label: "The smudge on its own, made much stronger: grey where nothing changed",
    after: "The picture with the smudge",
  },
  picture: "The picture the AI is looking at",
  pictureTitle: "Picture",
  loading: "Getting the picture…",
  looking: "The AI is looking…",
  says: (name: string) => `The AI says: ${name}.`,
  fooled: (before: string, after: string) =>
    `Before the smudge it said ${before}. Now it says ${after}.`,
  notFooled: (name: string) => `It still says ${name}. Try a stronger smudge or another picture.`,
  failed: "The AI could not look at the picture.",
  photoFailed: "The photo would not load.",
  retry: "Try again",
  describe: (picture: string, depth: string, smudge: string) =>
    `Looking at the ${picture}. Showing: ${depth}. ${smudge}`,
  describeSmudge: { on: "With a faint smudge.", off: "No smudge." },
  drawer: {
    mechanics: "What happens inside",
    layers:
      "The first layer sweeps small torches over the picture's colours, just like the pattern torch. Each later layer sweeps its torches over the maps the layer before made, so it finds patterns of patterns.",
    shrink:
      "Between some layers the maps are shrunk, keeping the strongest finds. So deeper torches cover more of the picture with each look, which lets them find bigger things.",
    end: "At the end, the deepest maps are added up and turned into a share for each of a thousand things the AI knows. The biggest share is its answer.",
    smudge:
      "The smudge is not random. For every colour of every dot, the AI is asked which way a tiny nudge would most move its answer away from what it said. Each colour gets nudged that way by a shade or two. Lots of tiny nudges, all pushing the same way, add up.",
    maths: "The maths",
    layer: "Each layer: map = max(0, Σ torch × maps from the layer before).",
    smudgeMaths:
      "The smudge: picture + ε × sign(∂ loss / ∂ picture), repeated a few times and kept within ε of the picture.",
    model: "The AI here is a small picture reader trained on photos of a thousand everyday things.",
  },
};

export const missionWords = {
  goal: "Fool the AI with a smudge too faint to see",
  hint: "Turn on the smudge and keep its strength at too faint to see. If the AI still gets it right, try another picture.",
  success:
    "You could not see the smudge, but the AI changed its answer. It looks at tiny patterns of colour, not at the cat or dog you see.",
};

export const predictionWords = {
  question:
    "A smudge changes every colour by just a shade or two, too faint for you to see. Will the AI still name the picture right?",
  same: "Yes, it will still get it right",
  fooled: "No, it will say something else",
};

// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { SinglePhoto } from "@/features/inside/use-photo";
import type { Cell, Preset } from "./model";

export const captions = {
  opening:
    "A tiny torch looks at just nine dots of a photo at a time, hunting for one small pattern. Design the pattern, then sweep the torch across the photo and watch where it lights up.",
  story:
    "The torch checks the same small pattern at every spot. Where the photo matches, the finding map turns dark; where it does not, the map stays blank. Picture-reading AIs use hundreds of these torches, each hunting for its own pattern.",
  compare: {
    label: "Compare your torch with the same torch swapped light for dark",
    leftLabel: "Your torch",
    rightLabel: "Swapped",
  },
};

const PHOTO_NAMES: Record<SinglePhoto, string> = {
  cat: "Cat",
  dog: "Dog",
  teapot: "Teapot",
  bananas: "Bananas",
  bicycle: "Bike",
};

const PRESET_NAMES: Record<Preset | "own", string> = {
  upDown: "Up-and-down edges",
  sideways: "Side-to-side edges",
  spot: "A bright spot",
  blank: "Empty torch",
  own: "My own",
};

const CELL_NAMES: Record<Cell, string> = { 1: "light", [-1]: "dark", 0: "anything" };
const PLACES = [
  "Top left",
  "Top middle",
  "Top right",
  "Middle left",
  "Centre",
  "Middle right",
  "Bottom left",
  "Bottom middle",
  "Bottom right",
];

export const words = {
  photos: { label: "Pick a photo", names: PHOTO_NAMES },
  presets: { label: "Start from", names: PRESET_NAMES },
  torch: {
    label: "Your torch: tap a square to change what it wants",
    cell: (place: number, cell: Cell) => `${PLACES[place] ?? ""}: wants ${CELL_NAMES[cell]}`,
    key: { light: "Wants light", dark: "Wants dark", any: "Anything" },
  },
  sweep: {
    label: "How far the torch has swept",
    none: "not started",
    some: "part of the photo",
    most: "most of the photo",
    all: "the whole photo",
    button: "Sweep it",
  },
  strict: {
    label: "How strong a match counts",
    any: "any match",
    fair: "a fair match",
    strong: "a strong match",
    perfect: "only a perfect match",
  },
  photo: "The photo in grey, with the torch on it",
  map: "The finding map: dark where the torch found its pattern",
  mapTitle: "Finding map",
  photoTitle: "Photo",
  loading: "Getting the photo…",
  failed: "The photo would not load.",
  retry: "Try again",
  found: {
    waiting: "Sweep the torch to fill in the finding map.",
    lots: "The torch found its pattern in many places.",
    some: "The torch found its pattern in a few places.",
    none: "The torch found nothing anywhere.",
  },
  companion: "Your own network can now carry a pattern torch too.",
  describe: (preset: string, found: string) => `Torch: ${preset}. ${found}`,
  drawer: {
    mechanics: "What the torch does",
    sweep:
      "At each spot, the torch lays its nine squares over nine dots of the photo. A square that wants light scores a point if the dot is light and loses one if it is dark; a square that wants dark does the opposite. The points are added up.",
    map: "That total goes on the finding map at the torch's spot. Then the torch moves one dot along and does it again, until it has covered the whole photo.",
    strict:
      "Totals below “how strong a match counts” are thrown away, so only good matches darken the map.",
    many: "A picture-reading AI learns the patterns in its torches by itself, and stacks layers of them: edges first, then shapes made of edges.",
    maths: "The maths",
    formula:
      "score(x, y) = Σ wᵢⱼ × (photo(x+i, y+j) − ½), for i, j in 0…2, then max(0, score − cut-off).",
  },
};

export const missionWords = {
  goal: "Build a torch that finds nothing",
  hint: "Try a pattern that never happens in a photo, like light and dark squares taking turns, and sweep the whole photo.",
  success:
    "Your torch's pattern is nowhere in the photo, so every spot scored too low to count. A torch only ever finds the pattern it carries.",
};

export const predictionWords = {
  question:
    "Sweep the up-and-down edge torch over the photo. Where will the finding map turn dark?",
  edges: "Along edges, where dark meets light",
  bright: "All over the bright parts",
  nowhere: "Nowhere at all",
};

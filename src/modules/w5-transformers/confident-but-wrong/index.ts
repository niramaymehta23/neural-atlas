import { clampNumber, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { TruthControls } from "./controls";
import { TruthDrawer } from "./drawer";
import { missions } from "./missions";
import { HEAT, KINDS, type TruthFrame, type TruthState } from "./model";
import { predictions } from "./predictions";
import { TruthScene } from "./scene";

/** The animals in the storyteller's books (as its manifest lists them). */
const ANIMALS = [
  "owl",
  "fox",
  "bear",
  "frog",
  "duck",
  "horse",
  "cow",
  "hen",
  "bee",
  "mouse",
  "rabbit",
  "hedgehog",
];

export const definition = defineModule<TruthState, TruthFrame>({
  initialState: { animal: "fox", kind: "eats", source: false, need: 0, heat: 0 },
  scene: TruthScene,
  controls: TruthControls,
  captions,
  missions,
  predictions,
  underTheHood: TruthDrawer,
  compare: (state) => ({ ...state, source: !state.source }),
  parseState: (saved) => ({
    animal: oneOf(saved.animal, ANIMALS, "fox"),
    kind: oneOf(saved.kind, KINDS, "eats"),
    source: saved.source,
    need: clampNumber(saved.need, 0, 1),
    heat: clampNumber(saved.heat, HEAT.min, HEAT.max),
  }),
  describe: (_state, frame) =>
    frame
      ? frame.heldBack
        ? words.describe.heldBack
        : words.describe.done(
            words.answer(frame.answer),
            words.sureWords(frame.sure),
            words.truth[frame.truth],
          )
      : words.describe.waiting,
});

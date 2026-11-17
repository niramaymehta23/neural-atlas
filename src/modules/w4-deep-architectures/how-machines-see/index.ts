import { clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { SINGLE_PHOTOS } from "@/features/inside/use-photo";
import { captions, words } from "./captions";
import { SeeControls } from "./controls";
import { SeeDrawer } from "./drawer";
import { missions } from "./missions";
import { DEPTHS, STRONGEST, WEAKEST, type SeeFrame, type SeeState } from "./model";
import { predictions } from "./predictions";
import { SeeScene } from "./scene";

export const definition = defineModule<SeeState, SeeFrame>({
  initialState: { photo: "dog", depth: "edges", smudge: false, strength: 1 },
  scene: SeeScene,
  controls: SeeControls,
  captions,
  missions,
  predictions,
  underTheHood: SeeDrawer,
  // The same picture with the smudge swapped: on beside off.
  compare: (state) => ({ ...state, smudge: !state.smudge }),
  parseState: (saved, initial) => ({
    photo: oneOf(saved.photo, SINGLE_PHOTOS, initial.photo),
    depth: oneOf(saved.depth, DEPTHS, initial.depth),
    smudge: saved.smudge === true,
    strength: clampWhole(saved.strength, WEAKEST, STRONGEST),
  }),
  describe: (state) =>
    words.describe(
      words.photos.names[state.photo],
      words.depth.names[state.depth],
      state.smudge ? words.describeSmudge.on : words.describeSmudge.off,
    ),
});

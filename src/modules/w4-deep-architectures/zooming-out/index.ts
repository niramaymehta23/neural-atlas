import { clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { SINGLE_PHOTOS } from "@/features/inside/use-photo";
import { captions, words } from "./captions";
import { describeShrink, ZoomControls } from "./controls";
import { ZoomDrawer } from "./drawer";
import { missions } from "./missions";
import { KEEPS, MOST, type ZoomFrame, type ZoomState } from "./model";
import { predictions } from "./predictions";
import { ZoomScene } from "./scene";

export const definition = defineModule<ZoomState, ZoomFrame>({
  initialState: { photo: "dog", shrink: 0, keep: "average" },
  scene: ZoomScene,
  controls: ZoomControls,
  captions,
  missions,
  predictions,
  underTheHood: ZoomDrawer,
  // The same shrink, keeping the other thing from each tile.
  compare: (state) => ({ ...state, keep: state.keep === "average" ? "brightest" : "average" }),
  parseState: (saved, initial) => ({
    photo: oneOf(saved.photo, SINGLE_PHOTOS, initial.photo),
    shrink: clampWhole(saved.shrink, 0, MOST),
    keep: oneOf(saved.keep, KEEPS, initial.keep),
  }),
  describe: (state) =>
    words.describe(
      words.photos.names[state.photo],
      describeShrink(state.shrink),
      words.keep.names[state.keep].toLowerCase(),
    ),
});

import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, CAPTIONS, PHOTOS, words } from "./captions";
import { PicturesControls } from "./controls";
import { PicturesDrawer } from "./drawer";
import { missions } from "./missions";
import { EMPTY, fooled, THRESHOLD, type PicturesFrame, type PicturesState } from "./model";
import { predictions } from "./predictions";
import { PicturesScene } from "./scene";

export const definition = defineModule<PicturesState, PicturesFrame>({
  initialState: { placed: [0, -1, -1, -1, -1, -1], threshold: THRESHOLD.start, holding: -1 },
  scene: PicturesScene,
  controls: PicturesControls,
  captions,
  missions,
  predictions,
  underTheHood: PicturesDrawer,
  compare: (state) => ({
    ...state,
    threshold: Math.min(THRESHOLD.max, state.threshold + 0.2),
    holding: -1,
  }),
  parseState: (saved) => {
    const placed = EMPTY.map((_, at) => {
      const caption = saved.placed[at];
      return typeof caption === "number" ? clampWhole(caption, -1, CAPTIONS.length - 1) : -1;
    });
    // A caption sits on one photo at most.
    const kept = placed.map((caption, at) =>
      caption >= 0 && placed.indexOf(caption) !== at ? -1 : caption,
    );
    return {
      placed: kept.slice(0, PHOTOS.length),
      threshold: clampNumber(saved.threshold, THRESHOLD.min, THRESHOLD.max),
      holding: -1,
    };
  },
  describe: (_state, frame) => {
    if (!frame) return words.describe.waiting;
    if (frame.placements.length === 0) return words.describe.none;
    return words.describe.placed(frame.placements.length, fooled(frame));
  },
});

import { count } from "@/design/copy";
import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { SqueezeControls } from "./controls";
import { SqueezeDrawer } from "./drawer";
import { missions } from "./missions";
import { closenessOf, FACES, KEEP, matches, type SqueezeFrame, type SqueezeState } from "./model";
import { predictions } from "./predictions";
import { SqueezeScene } from "./scene";

export const definition = defineModule<SqueezeState, SqueezeFrame>({
  initialState: { face: 0, keep: KEEP.most, smudge: 0 },
  scene: SqueezeScene,
  controls: SqueezeControls,
  captions,
  missions,
  predictions,
  underTheHood: SqueezeDrawer,
  compare: (state) => ({ ...state, keep: KEEP.most }),
  parseState: (saved) => ({
    face: clampWhole(saved.face, 0, FACES - 1),
    keep: clampWhole(saved.keep, KEEP.min, KEEP.most),
    smudge: Math.round(clampNumber(saved.smudge, 0, 1) * 100) / 100,
  }),
  describe: (state, frame) => {
    if (!frame || !matches(state, frame)) return words.describe.loading;
    const kept = state.keep === 1 ? words.keep.one : words.keep.many(count(state.keep));
    return words.describe.done(kept, words.closeness[closenessOf(frame.gap)]);
  },
});

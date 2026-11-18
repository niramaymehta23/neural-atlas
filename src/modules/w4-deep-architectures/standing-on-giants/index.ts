import { clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { count } from "@/design/copy";
import { captions, words } from "./captions";
import { describeTeach, GiantControls } from "./controls";
import { GiantDrawer } from "./drawer";
import { missions } from "./missions";
import {
  GROUPS,
  keyOf,
  MOST_TEACH,
  STARTS,
  TESTS,
  type GiantFrame,
  type GiantState,
} from "./model";
import { predictions } from "./predictions";
import { GiantScene } from "./scene";

export const definition = defineModule<GiantState, GiantFrame>({
  initialState: { start: "blank", teach: MOST_TEACH },
  scene: GiantScene,
  controls: GiantControls,
  captions,
  missions,
  predictions,
  underTheHood: GiantDrawer,
  // The same teaching photos, from the other start.
  compare: (state) => ({ ...state, start: state.start === "giant" ? "blank" : "giant" }),
  parseState: (saved, initial) => ({
    start: oneOf(saved.start, STARTS, initial.start),
    teach: clampWhole(saved.teach, 1, MOST_TEACH),
  }),
  describe: (state, frame) =>
    words.describe(
      words.start.short[state.start],
      describeTeach(state.teach),
      frame && frame.key === keyOf(state)
        ? words.score(count(frame.right), count(GROUPS * TESTS))
        : words.describeWaiting,
    ),
});

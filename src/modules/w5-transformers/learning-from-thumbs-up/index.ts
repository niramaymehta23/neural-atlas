import { capList } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { ThumbsControls } from "./controls";
import { ThumbsDrawer } from "./drawer";
import { missions } from "./missions";
import { judgePick, MOST_PICKS, type ThumbsFrame, type ThumbsState } from "./model";
import { predictions } from "./predictions";
import { ThumbsScene } from "./scene";

const isPick = (value: unknown): value is number => value === 0 || value === 1;

export const definition = defineModule<ThumbsState, ThumbsFrame>({
  initialState: { picks: [] },
  scene: ThumbsScene,
  controls: ThumbsControls,
  captions,
  missions,
  predictions,
  underTheHood: ThumbsDrawer,
  // The same number of picks, made by the compliment-loving judge.
  compare: (state) => ({ picks: state.picks.map((_, at) => judgePick(at)) }),
  parseState: (saved) => ({ picks: capList(saved.picks, MOST_PICKS, isPick) }),
  describe: (state, frame) =>
    words.describe(state.picks.length, frame?.yesMan ? words.yesMan : words.honest),
});

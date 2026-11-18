import { capList, clampNumber } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { ThumbsControls } from "./controls";
import { ThumbsDrawer } from "./drawer";
import { missions } from "./missions";
import { CARE, judgePick, MOST_PICKS, TEACH, type ThumbsFrame, type ThumbsState } from "./model";
import { predictions } from "./predictions";
import { ThumbsScene } from "./scene";

const isPick = (value: unknown): value is number => value === 0 || value === 1;

export const definition = defineModule<ThumbsState, ThumbsFrame>({
  initialState: { picks: [], teach: TEACH.start, care: CARE.start },
  scene: ThumbsScene,
  controls: ThumbsControls,
  captions,
  missions,
  predictions,
  underTheHood: ThumbsDrawer,
  // The same number of picks, made by the compliment-loving judge.
  compare: (state) => ({ ...state, picks: state.picks.map((_, at) => judgePick(at)) }),
  parseState: (saved) => ({
    picks: capList(saved.picks, MOST_PICKS, isPick),
    teach: clampNumber(saved.teach, TEACH.min, TEACH.max),
    care: clampNumber(saved.care, CARE.min, CARE.max),
  }),
  describe: (state, frame) =>
    words.describe(state.picks.length, frame?.yesMan ? words.yesMan : words.honest),
});

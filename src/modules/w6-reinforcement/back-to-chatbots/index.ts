import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { ChatControls } from "./controls";
import { ChatDrawer } from "./drawer";
import { missions } from "./missions";
import { isFinished, type ChatFrame, type ChatState } from "./model";
import { predictions } from "./predictions";
import { ChatScene, verdictOf } from "./scene";

const MOST_RUNS = 10_000;
/** The compare side's leash: tight. */
const TIGHT = 0.8;

export const definition = defineModule<ChatState, ChatFrame>({
  initialState: { taste: 0.5, train: 0.5, leash: 0.5, runs: 0 },
  scene: ChatScene,
  controls: ChatControls,
  captions,
  missions,
  predictions,
  underTheHood: ChatDrawer,
  // The same crowd and training, on a tight leash (or, if yours is already tight, none at all).
  compare: (state) => ({ ...state, leash: state.leash >= TIGHT ? 0 : TIGHT }),
  parseState: (saved) => ({
    taste: clampNumber(saved.taste, 0, 1),
    train: clampNumber(saved.train, 0, 1),
    leash: clampNumber(saved.leash, 0, 1),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(verdictOf(frame.praise));
  },
  trains: true,
});

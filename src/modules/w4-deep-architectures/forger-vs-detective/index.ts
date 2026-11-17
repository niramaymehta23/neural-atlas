import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { DuelControls } from "./controls";
import { DuelDrawer } from "./drawer";
import { missions } from "./missions";
import { isFinished, TRIES, type DuelFrame, type DuelState } from "./model";
import { predictions } from "./predictions";
import { DuelScene, facesLine } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<DuelState, DuelFrame>({
  initialState: { forger: 0.46, detective: 0.46, tries: 1, runs: 0 },
  scene: DuelScene,
  controls: DuelControls,
  captions,
  missions,
  predictions,
  underTheHood: DuelDrawer,
  compare: (state) => ({ ...state, tries: state.tries === TRIES.min ? TRIES.max : TRIES.min }),
  parseState: (saved) => ({
    forger: clampNumber(saved.forger, 0, 1),
    detective: clampNumber(saved.detective, 0, 1),
    tries: clampWhole(saved.tries, TRIES.min, TRIES.max),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(facesLine(frame));
  },
  trains: true,
});

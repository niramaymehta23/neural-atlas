import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { CramControls } from "./controls";
import { CramDrawer } from "./drawer";
import { missions } from "./missions";
import { isFinished, TEAM, type CramFrame, type CramState } from "./model";
import { predictions } from "./predictions";
import { CramScene, scoresSentence } from "./scene";

const MOST_RUNS = 10_000;
/** The team dial moves in fours. */
const TEAM_STEP = 4;

export const definition = defineModule<CramState, CramFrame>({
  initialState: { off: 0, team: 16, runs: 0 },
  scene: CramScene,
  controls: CramControls,
  captions,
  missions,
  predictions,
  underTheHood: CramDrawer,
  compare: (state) => ({ ...state, off: 0 }),
  // A link's dials stay on their dials (the team on a step of four), the run count sane.
  parseState: (saved) => ({
    off: clampNumber(Number(saved.off) || 0, 0, 1),
    team:
      Math.round(clampNumber(Number(saved.team) || 0, TEAM.min, TEAM.max) / TEAM_STEP) * TEAM_STEP,
    runs: clampWhole(Number(saved.runs) || 0, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.practising;
    return scoresSentence(frame);
  },
  trains: true,
});

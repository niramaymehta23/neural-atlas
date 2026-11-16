import { defineModule } from "@/platform/contract";
import { captions } from "./captions";
import { ScoringControls } from "./controls";
import { ScoringDrawer } from "./drawer";
import { missions } from "./missions";
import { KITCHEN, type ScoringFrame, type ScoringState } from "./model";
import { predictions } from "./predictions";
import { ScoringScene } from "./scene";

/** The compare side learns slowly, so its scores settle where a fast learner's keep jumping. */
const STEADY = 0.2;

export const definition = defineModule<ScoringState, ScoringFrame>({
  initialState: {
    tiles: KITCHEN,
    curiosity: 0.2,
    learnRate: 0.4,
    lookAhead: 0.9,
    speed: 0.5,
    brush: "wall",
    playing: false,
    episodes: 0,
    attempt: 0,
  },
  scene: ScoringScene,
  controls: ScoringControls,
  captions,
  missions,
  predictions,
  underTheHood: ScoringDrawer,
  compare: (state) => ({ ...state, learnRate: STEADY }),
  trains: true,
});

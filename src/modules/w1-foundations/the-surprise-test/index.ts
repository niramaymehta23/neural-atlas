import { count } from "@/design/copy";
import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { SurpriseControls } from "./controls";
import { SurpriseDrawer } from "./drawer";
import { missions } from "./missions";
import { isFinished, LIMITS, type SurpriseFrame, type SurpriseState } from "./model";
import { predictions } from "./predictions";
import { SurpriseScene } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<SurpriseState, SurpriseFrame>({
  initialState: { hide: 0.3, cells: 6, peek: false, fresh: false, runs: 0 },
  scene: SurpriseScene,
  controls: SurpriseControls,
  captions,
  missions,
  predictions,
  underTheHood: SurpriseDrawer,
  compare: (state) => ({ ...state, peek: !state.peek }),
  parseState: (saved) => ({
    hide: clampNumber(Number(saved.hide) || 0, 0, 1),
    cells: clampWhole(Number(saved.cells) || 0, LIMITS.cells.min, LIMITS.cells.max),
    peek: saved.peek === true,
    fresh: saved.fresh === true,
    runs: clampWhole(Number(saved.runs) || 0, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(
      count(frame.practice.right),
      count(frame.practice.total),
      count(frame.surprise.right),
      count(frame.surprise.total),
    );
  },
  trains: true,
});

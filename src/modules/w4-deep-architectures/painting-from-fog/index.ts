import { clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { describeCleanings, FogControls } from "./controls";
import { FogDrawer } from "./drawer";
import { missions } from "./missions";
import {
  BRUSHES,
  CLEANINGS,
  FOGS,
  isFinished,
  isMush,
  MOST_RUNS,
  tidyPaint,
  type FogFrame,
  type FogState,
} from "./model";
import { predictions } from "./predictions";
import { FogScene } from "./scene";

export const definition = defineModule<FogState, FogFrame>({
  initialState: { cleanings: 20, fog: 1, paint: [], brush: "ink", runs: 0 },
  scene: FogScene,
  controls: FogControls,
  captions,
  missions,
  predictions,
  underTheHood: FogDrawer,
  compare: (state) => ({ ...state, cleanings: state.cleanings <= 10 ? CLEANINGS.most : 1 }),
  parseState: (saved, initial) => ({
    cleanings: clampWhole(saved.cleanings, CLEANINGS.min, CLEANINGS.most),
    fog: clampWhole(saved.fog, FOGS.min, FOGS.most),
    paint: tidyPaint(Array.isArray(saved.paint) ? saved.paint : []),
    brush: oneOf(saved.brush, BRUSHES, initial.brush),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    const steps = describeCleanings(state.cleanings);
    if (state.runs === 0) return words.describe.waiting(steps);
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(steps, isMush(frame) ? words.verdict.mush : words.verdict.face);
  },
  trains: true,
});

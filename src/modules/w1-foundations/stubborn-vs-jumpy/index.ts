import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions } from "./captions";
import { DartsControls } from "./controls";
import { DartsDrawer } from "./drawer";
import { missions } from "./missions";
import { LIMITS, type DartsState } from "./model";
import { predictions } from "./predictions";
import { boardSentence, DartsScene } from "./scene";

const MOST_THROWS = 100_000;

export const definition = defineModule<DartsState>({
  initialState: { bendy: 2, examples: 15, throws: 0 },
  scene: DartsScene,
  controls: DartsControls,
  captions,
  missions,
  predictions,
  underTheHood: DartsDrawer,
  compare: (state) => ({ ...state, bendy: 1 }),
  parseState: (saved) => ({
    bendy: clampWhole(Number(saved.bendy) || 0, LIMITS.bendy.min, LIMITS.bendy.max),
    examples: clampWhole(Number(saved.examples) || 0, LIMITS.examples.min, LIMITS.examples.max),
    throws: clampWhole(Number(saved.throws) || 0, 0, MOST_THROWS),
  }),
  describe: (state) => boardSentence(state),
});

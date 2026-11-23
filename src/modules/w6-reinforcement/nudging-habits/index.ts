import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { HabitControls } from "./controls";
import { HabitDrawer } from "./drawer";
import { missions } from "./missions";
import {
  BATCH,
  DEFAULT_BATCH,
  DEFAULT_NUDGE,
  isFinished,
  keyOf,
  WILD,
  type HabitFrame,
  type HabitState,
} from "./model";
import { predictions } from "./predictions";
import { HabitScene, reachedLine } from "./scene";

const MOST_RUNS = 10_000;
const MOST_PUPPIES = 1_000;

export const definition = defineModule<HabitState, HabitFrame>({
  initialState: { nudge: DEFAULT_NUDGE, batch: DEFAULT_BATCH, attempt: 0, runs: 0 },
  scene: HabitScene,
  controls: HabitControls,
  captions,
  missions,
  predictions,
  underTheHood: HabitDrawer,
  // The other end of the nudge: the hardest one, or the usual firm one for a puppy already shoved.
  compare: (state) => ({ ...state, nudge: state.nudge >= WILD ? DEFAULT_NUDGE : 1 }),
  parseState: (saved) => ({
    nudge: clampNumber(saved.nudge, 0, 1),
    batch: clampWhole(saved.batch, BATCH.min, BATCH.max),
    attempt: clampWhole(saved.attempt, 0, MOST_PUPPIES),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame) || frame.key !== keyOf(state)) return words.describe.working;
    return words.describe.done(reachedLine(frame));
  },
  trains: true,
});

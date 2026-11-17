import { count } from "@/design/copy";
import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { StudyControls } from "./controls";
import { StudyDrawer } from "./drawer";
import { missions } from "./missions";
import { isFinished, keyOf, LIMITS, sizeOf, type StudyFrame, type StudyState } from "./model";
import { predictions } from "./predictions";
import { StudyScene } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<StudyState, StudyFrame>({
  initialState: { cells: 3, questions: 12, runs: 0 },
  scene: StudyScene,
  controls: StudyControls,
  captions,
  missions,
  predictions,
  underTheHood: StudyDrawer,
  compare: (state) => ({ ...state, cells: 2 }),
  parseState: (saved) => ({
    cells: clampWhole(Number(saved.cells) || 0, LIMITS.cells.min, LIMITS.cells.max),
    questions: clampWhole(Number(saved.questions) || 0, LIMITS.questions.min, LIMITS.questions.max),
    runs: clampWhole(Number(saved.runs) || 0, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting(count(state.questions));
    if (!isFinished(state, frame) || frame.key !== keyOf(state)) return words.describe.working;
    return words.describe.done(words.sizes[sizeOf(frame.loss)], words.sizes[sizeOf(frame.exam)]);
  },
  trains: true,
});

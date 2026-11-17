import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { PlanControls } from "./controls";
import { PlanDrawer } from "./drawer";
import { missions } from "./missions";
import {
  isFinished,
  PARTS,
  planEnding,
  planFor,
  VIEWS,
  type PlanFrame,
  type PlanState,
} from "./model";
import { predictions } from "./predictions";
import { PlanScene } from "./scene";

const MOST_RUNS = 10_000;
const BOLD = 0.55;
const CAREFUL = 0.4;

export const definition = defineModule<PlanState, PlanFrame>({
  initialState: {
    plan: planFor(BOLD, CAREFUL),
    bold: BOLD,
    careful: CAREFUL,
    runs: 0,
    view: "plan",
  },
  scene: PlanScene,
  controls: PlanControls,
  captions,
  missions,
  predictions,
  underTheHood: PlanDrawer,
  // The plan's first step, kept the whole way.
  compare: (state) => ({ ...state, plan: state.plan.map(() => state.plan[0] ?? 0) }),
  // A link's plan has six bars, each on its slider; its dials stay on their dials.
  parseState: (saved, initial) => {
    const bars = Array.isArray(saved.plan) ? saved.plan : [];
    return {
      plan: initial.plan.map((bar, index) => clampNumber(Number(bars[index] ?? bar) || 0, 0, 1)),
      bold: clampNumber(Number(saved.bold) || 0, 0, 1),
      careful: clampNumber(Number(saved.careful) || 0, 0, 1),
      runs: clampWhole(Number(saved.runs) || 0, 0, MOST_RUNS),
      view: oneOf(saved.view, VIEWS, initial.view),
    };
  },
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.walking;
    return words.ending[planEnding(state.plan)];
  },
  trains: true,
});

export { PARTS };

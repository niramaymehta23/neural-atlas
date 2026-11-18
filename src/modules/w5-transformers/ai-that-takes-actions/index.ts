import { clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, TASKS, words } from "./captions";
import { AgentControls } from "./controls";
import { AgentDrawer } from "./drawer";
import { missions } from "./missions";
import { BROKEN, LIMIT, NEVER, runOf, type AgentFrame, type AgentState } from "./model";
import { predictions } from "./predictions";
import { AgentScene } from "./scene";

export const definition = defineModule<AgentState, AgentFrame>({
  initialState: { task: 0, broken: "none", patience: 3, shown: 1 },
  scene: AgentScene,
  controls: AgentControls,
  captions,
  missions,
  predictions,
  underTheHood: AgentDrawer,
  compare: (state) => ({ ...state, patience: 2 }),
  parseState: (saved) => ({
    task: clampWhole(saved.task, 0, TASKS.length - 1),
    broken: oneOf(saved.broken, BROKEN, "none"),
    patience: clampWhole(saved.patience, 1, NEVER),
    shown: clampWhole(saved.shown, 1, LIMIT),
  }),
  describe: (state, frame) => {
    const { outcome } = runOf(state);
    const shown = words.step(frame?.shown ?? 1, frame?.steps ?? 1);
    return words.describe(
      shown,
      (frame?.shown ?? 0) >= (frame?.steps ?? 1) ? words.outcome[outcome] : "",
    );
  },
});

import { clampNumber } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { ScaleControls } from "./controls";
import { ScaleDrawer } from "./drawer";
import { missions } from "./missions";
import { affordable, bestFor, LIMITS, type ScaleFrame, type ScaleState } from "./model";
import { predictions } from "./predictions";
import { ScaleScene } from "./scene";

const round = (value: number) => Math.round(value * 10) / 10;

export const definition = defineModule<ScaleState, ScaleFrame>({
  initialState: { brain: 8, reading: 10, budget: 20 },
  scene: ScaleScene,
  controls: ScaleControls,
  captions,
  missions,
  predictions,
  underTheHood: ScaleDrawer,
  compare: (state) => {
    const best = bestFor(state.budget);
    return {
      budget: state.budget,
      brain: round(clampNumber(best.brain, LIMITS.brain.min, LIMITS.brain.max)),
      reading: round(
        clampNumber(affordable(best.brain, state.budget), LIMITS.reading.min, LIMITS.reading.max),
      ),
    };
  },
  parseState: (saved) => ({
    brain: clampNumber(saved.brain, LIMITS.brain.min, LIMITS.brain.max),
    reading: clampNumber(saved.reading, LIMITS.reading.min, LIMITS.reading.max),
    budget: clampNumber(saved.budget, LIMITS.budget.min, LIMITS.budget.max),
  }),
  describe: (_state, frame) =>
    frame
      ? words.describe(
          words.yours(words.quality(frame.loss)),
          words.bestLine(words.quality(frame.best)),
        )
      : "",
});

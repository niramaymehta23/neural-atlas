import { clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { MapControls } from "./controls";
import { MapDrawer } from "./drawer";
import { missions } from "./missions";
import { DATA, LIMITS, runKeyOf, type MapFrame, type MapState } from "./model";
import { predictions } from "./predictions";
import { MapScene, statusOf } from "./scene";

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export const definition = defineModule<MapState, MapFrame>({
  initialState: { data: "zoo", count: 400, perplexity: 20, steps: 0, attempt: 0, running: false },
  scene: MapScene,
  controls: MapControls,
  captions,
  missions,
  predictions,
  underTheHood: MapDrawer,
  compare: (state) => ({ ...state, perplexity: LIMITS.perplexity.min }),
  parseState: (saved, initial) => ({
    data: oneOf(saved.data, DATA, initial.data),
    count: roundTo(clampWhole(saved.count, LIMITS.count.min, LIMITS.count.max), LIMITS.count.step),
    perplexity: clampWhole(saved.perplexity, LIMITS.perplexity.min, LIMITS.perplexity.max),
    steps: clampWhole(saved.steps, LIMITS.steps.min, LIMITS.steps.max),
    attempt: clampWhole(saved.attempt, LIMITS.attempt.min, LIMITS.attempt.max),
    // A link redraws the map to its saved step and waits there.
    running: false,
  }),
  describe: (state, frame) =>
    words.describe(
      words.data[state.data],
      statusOf(frame && frame.run === runKeyOf(state) ? frame.epoch : 0),
    ),
  trains: true,
});

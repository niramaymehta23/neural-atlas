import { count } from "@/design/copy";
import { LENGTH, memoryOf } from "@/features/memory/run";
import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { ReadingControls } from "./controls";
import { ReadingDrawer } from "./drawer";
import { missions } from "./missions";
import { isFinished, STARTS, type ReadingFrame, type ReadingState } from "./model";
import { predictions } from "./predictions";
import { ReadingScene } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<ReadingState, ReadingFrame>({
  initialState: { length: 6, step: 0.4, start: "sunny", runs: 0 },
  scene: ReadingScene,
  controls: ReadingControls,
  captions,
  missions,
  predictions,
  underTheHood: ReadingDrawer,
  parseState: (saved, initial) => ({
    length: clampWhole(saved.length, LENGTH.min, LENGTH.max),
    step: clampNumber(saved.step, 0, 1),
    start: oneOf(saved.start, STARTS, initial.start),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    const length = words.length.words(count(state.length));
    if (state.runs === 0) return words.describe.waiting(length);
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(length, words.memory[memoryOf(frame.right)]);
  },
  trains: true,
});

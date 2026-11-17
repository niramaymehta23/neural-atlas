import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { VALLEYS } from "@/features/building/race/race";
import { captions, words } from "./captions";
import { SmarterControls } from "./controls";
import { SmarterDrawer } from "./drawer";
import { missions } from "./missions";
import { isFinished, keyOf, result, type SmarterFrame, type SmarterState } from "./model";
import { predictions } from "./predictions";
import { SmarterScene } from "./scene";

const MOST_RUNS = 10_000;
const onGround = (value: unknown) => clampNumber(Number(value) || 0, -1, 1);

export const definition = defineModule<SmarterState, SmarterFrame>({
  initialState: {
    valley: "bowl",
    step: 0.1,
    examples: 1,
    start: { x: 0.75, z: 0.6 },
    runs: 0,
  },
  scene: SmarterScene,
  controls: SmarterControls,
  captions,
  missions,
  predictions,
  underTheHood: SmarterDrawer,
  compare: (state) => ({ ...state, examples: 1 }),
  // A link's dials stay on their dials, the start on the ground, the race count sane.
  parseState: (saved, initial) => {
    const start: Partial<SmarterState["start"]> = saved.start ?? {};
    return {
      valley: oneOf(saved.valley, VALLEYS, initial.valley),
      step: clampNumber(Number(saved.step) || 0, 0, 1),
      examples: clampNumber(Number(saved.examples) || 0, 0, 1),
      start: { x: onGround(start.x), z: onGround(start.z) },
      runs: clampWhole(Number(saved.runs) || 0, 0, MOST_RUNS),
    };
  },
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!frame || frame.key !== keyOf(state) || !isFinished(state, frame))
      return words.describe.racing;
    const outcome = result(state.valley, frame);
    return outcome.level
      ? words.describe.level
      : words.describe.winner(words.names[outcome.lowest], words.names[outcome.last]);
  },
  trains: true,
});

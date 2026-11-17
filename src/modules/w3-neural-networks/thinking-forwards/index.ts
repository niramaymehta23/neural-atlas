import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { ForwardControls } from "./controls";
import { ForwardDrawer } from "./drawer";
import { missions } from "./missions";
import { dialOf, inputs, LAYERS, type ForwardFrame, type ForwardState } from "./model";
import { predictions } from "./predictions";
import { answerLine, describeRed, describeRound, ForwardScene } from "./scene";

const MOST_THOUGHTS = 1_000_000;

export const definition = defineModule<ForwardState, ForwardFrame>({
  initialState: { round: dialOf(0.55), red: dialOf(0.55), shown: 0, thoughts: 0 },
  scene: ForwardScene,
  controls: ForwardControls,
  captions,
  missions,
  predictions,
  underTheHood: ForwardDrawer,
  parseState: (saved) => ({
    round: clampNumber(saved.round, 0, 1),
    red: clampNumber(saved.red, 0, 1),
    shown: clampWhole(saved.shown, 0, LAYERS),
    thoughts: clampWhole(saved.thoughts, 0, MOST_THOUGHTS),
  }),
  describe: (state) => {
    const [round = 0, red = 0] = inputs(state);
    if (state.thoughts === 0) return words.describe.waiting(describeRound(round), describeRed(red));
    if (state.shown < LAYERS)
      return words.describe.travelling(words.layers[state.shown] ?? words.layers[0] ?? "");
    return words.describe.answered(answerLine(state));
  },
});

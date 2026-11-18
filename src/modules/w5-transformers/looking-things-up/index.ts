import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, LIBRARY, QUESTIONS, words } from "./captions";
import { LookControls } from "./controls";
import { LookDrawer } from "./drawer";
import { missions } from "./missions";
import { MOST_LETTERS, NEED, type LookFrame, type LookState } from "./model";
import { predictions } from "./predictions";
import { LookScene } from "./scene";

export const definition = defineModule<LookState, LookFrame>({
  initialState: {
    question: QUESTIONS[0].ask,
    handed: -1,
    lookUp: true,
    need: 0,
    listed: LIBRARY.length,
  },
  scene: LookScene,
  controls: LookControls,
  captions,
  missions,
  predictions,
  underTheHood: LookDrawer,
  compare: (state) => ({ ...state, handed: -1, lookUp: true }),
  parseState: (saved) => {
    const handed = clampWhole(saved.handed, -1, LIBRARY.length);
    return {
      question: saved.question.slice(0, MOST_LETTERS),
      handed: handed >= LIBRARY.length ? -1 : handed,
      lookUp: saved.lookUp,
      need: clampNumber(saved.need, NEED.min, NEED.max),
      listed: clampWhole(saved.listed, 1, LIBRARY.length),
    };
  },
  describe: (_state, frame) => {
    if (!frame) return words.describe.waiting;
    const used = LIBRARY[frame.used];
    return used && frame.refused
      ? words.describe.refused(used.title)
      : used
        ? words.describe.done(used.title, frame.answer)
        : words.describe.memory;
  },
});

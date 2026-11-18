import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, SAMPLES, words } from "./captions";
import { PiecesControls } from "./controls";
import { PiecesDrawer } from "./drawer";
import { missions } from "./missions";
import { LONGEST, MOST_LETTERS, type PiecesFrame, type PiecesState } from "./model";
import { predictions } from "./predictions";
import { costLine, PiecesScene } from "./scene";

export const definition = defineModule<PiecesState, PiecesFrame>({
  initialState: { text: SAMPLES.english, known: 1, longest: LONGEST },
  scene: PiecesScene,
  controls: PiecesControls,
  captions,
  missions,
  predictions,
  underTheHood: PiecesDrawer,
  // Every piece known against single bits only (or the other way round).
  compare: (state) => ({ ...state, known: state.known >= 0.5 ? 0 : 1 }),
  parseState: (saved) => ({
    text: saved.text.slice(0, MOST_LETTERS),
    known: clampNumber(saved.known, 0, 1),
    longest: clampWhole(saved.longest, 1, LONGEST),
  }),
  describe: (_state, frame) => {
    if (!frame) return words.describe.waiting;
    if (frame.letters === 0) return words.describe.empty;
    return words.describe.done(costLine(frame));
  },
});

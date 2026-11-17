import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { CellControls } from "./controls";
import { CellDrawer } from "./drawer";
import { missions } from "./missions";
import { INITIAL, MAX_TRUST, VOICES, type CellFrame, type CellState } from "./model";
import { predictions } from "./predictions";
import { answerWords, CellScene } from "./scene";

const MOST_CHANGES = 1_000_000;
const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const definition = defineModule<CellState, CellFrame>({
  initialState: INITIAL,
  scene: CellScene,
  controls: CellControls,
  captions,
  missions,
  predictions,
  underTheHood: CellDrawer,
  compare: (state) => ({ ...state, weights: VOICES.map(() => 1) }),
  // A link's trust stays on its strings, its voices yes or quiet, its dials on their dials.
  parseState: (saved, initial) => ({
    weights: VOICES.map((_, index) =>
      clampNumber(
        Number(listOf(saved.weights)[index] ?? initial.weights[index]) || 0,
        -MAX_TRUST,
        MAX_TRUST,
      ),
    ),
    voices: VOICES.map((_, index) => (listOf(saved.voices)[index] === 1 ? 1 : 0)),
    convince: clampNumber(saved.convince, 0, 1),
    firmness: clampNumber(saved.firmness, 0, 1),
    changes: clampWhole(saved.changes, 0, MOST_CHANGES),
  }),
  describe: (state) => {
    const { yes, sure } = answerWords(state);
    const saying = VOICES.filter((_, index) => state.voices[index] === 1).map((id) =>
      words.voices[id].toLocaleLowerCase("en-GB"),
    );
    return words.describe.says(
      yes ? words.describe.yes : words.describe.no,
      sure,
      saying.length > 0 ? saying.join(", ") : words.describe.nobody,
    );
  },
});

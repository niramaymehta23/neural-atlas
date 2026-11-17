import { count } from "@/design/copy";
import { clampNumber } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { SpamControls } from "./controls";
import { SpamDrawer } from "./drawer";
import { missions } from "./missions";
import { cleanMessage, reading, saysSpam, STANDARD, type SpamState } from "./model";
import { predictions } from "./predictions";
import { SpamScene } from "./scene";

export const definition = defineModule<SpamState>({
  initialState: {
    message: "Win a free prize now",
    caution: STANDARD.caution,
    suspicion: STANDARD.suspicion,
  },
  scene: SpamScene,
  controls: SpamControls,
  captions,
  missions,
  predictions,
  underTheHood: SpamDrawer,
  // Opposite care for rare words: very careful, or very bold when it is already careful.
  compare: (state) => ({ ...state, caution: state.caution > 0.5 ? 0 : 1 }),
  parseState: (saved) => ({
    message: cleanMessage(saved.message),
    caution: clampNumber(saved.caution, 0, 1),
    suspicion: clampNumber(saved.suspicion, 0, 1),
  }),
  describe: (state) => {
    const { words: read } = reading(state);
    if (read.length === 0) return words.describe.empty;
    return words.describe.read(
      words.describe.words(count(read.length), read.length === 1),
      saysSpam(state) ? words.verdict.spam : words.verdict.normal,
    );
  },
});

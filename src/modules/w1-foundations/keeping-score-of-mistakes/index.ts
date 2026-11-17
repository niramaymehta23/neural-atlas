import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { ScoreControls } from "./controls";
import { ScoreDrawer } from "./drawer";
import { missions } from "./missions";
import { groupMisses, ignoresRare, rareCount, type ScoreFrame, type ScoreState } from "./model";
import { predictions } from "./predictions";
import { missWord, ScoreScene, stage, strictWord } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<ScoreState, ScoreFrame>({
  initialState: { strict: 1, rare: 0.5, runs: 0 },
  scene: ScoreScene,
  controls: ScoreControls,
  captions,
  missions,
  predictions,
  underTheHood: ScoreDrawer,
  compare: (state) => ({ ...state, strict: 0 }),
  parseState: (saved) => ({
    strict: clampNumber(Number(saved.strict) || 0, 0, 1),
    rare: clampNumber(Number(saved.rare) || 0, 0, 1),
    runs: clampWhole(Number(saved.runs) || 0, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    const now = stage(state, frame);
    if (now === "waiting") return words.describe.waiting(strictWord(state.strict));
    if (now === "walking" || !frame) return words.describe.walking;
    const line = { slope: frame.slope, height: frame.height };
    const rare =
      rareCount(state.rare) === 0
        ? words.describe.rareNone
        : ignoresRare(state, line)
          ? words.describe.rareIgnored
          : words.describe.rareNear;
    return words.describe.done(
      strictWord(state.strict),
      missWord(groupMisses(state, line).main),
      rare,
    );
  },
  trains: true,
});

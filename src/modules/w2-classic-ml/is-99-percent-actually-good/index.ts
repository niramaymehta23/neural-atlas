import { count, outOf } from "@/design/copy";
import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { SortControls } from "./controls";
import { SortDrawer } from "./drawer";
import { missions } from "./missions";
import { LIMITS, sortOf, type SortState } from "./model";
import { predictions } from "./predictions";
import { SortScene } from "./scene";

const HALFWAY = 0.5;

export const definition = defineModule<SortState>({
  initialState: { rare: 10, threshold: 0.5 },
  scene: SortScene,
  controls: SortControls,
  captions,
  missions,
  predictions,
  underTheHood: SortDrawer,
  // Halfway is the plain alternative; when it is already halfway, a never-suspicious sorter.
  compare: (state) => ({ ...state, threshold: state.threshold === HALFWAY ? 1 : HALFWAY }),
  parseState: (saved) => ({
    rare: clampWhole(saved.rare, LIMITS.rare.min, LIMITS.rare.max),
    threshold: clampNumber(saved.threshold, 0, 1),
  }),
  describe: (state) => {
    const { counts, right, wormy } = sortOf(state);
    return words.describe(
      words.right(outOf(right)),
      wormy === 0 ? words.noWorms : words.caught(count(counts.caught), count(wormy)),
    );
  },
});

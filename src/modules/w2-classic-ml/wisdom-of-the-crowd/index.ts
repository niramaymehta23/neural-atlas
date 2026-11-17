import { count, outOf, sentenceStart } from "@/design/copy";
import { PULL } from "@/features/classic/ClassicGarden";
import { parseGarden, plantGarden } from "@/features/classic/garden";
import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { CrowdControls } from "./controls";
import { CrowdDrawer } from "./drawer";
import { missions } from "./missions";
import { crowdScores, GARDENS, LIMITS, type CrowdState } from "./model";
import { predictions } from "./predictions";
import { CrowdScene } from "./scene";

/** New forests a link may ask for. */
const MOST_ATTEMPTS = 1_000_000;

export const definition = defineModule<CrowdState>({
  initialState: {
    garden: "moons",
    points: plantGarden("moons"),
    brush: 0,
    trees: 9,
    variety: 0.7,
    attempt: 0,
  },
  scene: CrowdScene,
  controls: CrowdControls,
  captions,
  missions,
  predictions,
  underTheHood: CrowdDrawer,
  compare: (state) => ({ ...state, trees: 1 }),
  parseState: (saved, initial) => ({
    ...parseGarden(saved, GARDENS, initial.garden, PULL + 1),
    trees: clampWhole(saved.trees, LIMITS.trees.min, LIMITS.trees.max),
    variety: clampNumber(saved.variety, 0, 1),
    attempt: clampWhole(saved.attempt, 0, MOST_ATTEMPTS),
  }),
  describe: (state) => {
    if (state.points.length === 0) return words.describe.empty;
    const { own, fresh } = crowdScores(state);
    const trees = sentenceStart(
      state.trees === 1 ? words.trees.one : words.trees.many(count(state.trees)),
    );
    return words.describe.crowd(
      trees,
      state.trees === 1,
      outOf(own, { noun: "" }),
      fresh === null ? null : outOf(fresh, { noun: "" }),
    );
  },
});

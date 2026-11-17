import { count, outOf } from "@/design/copy";
import { PULL } from "@/features/classic/ClassicGarden";
import { parseGarden, plantGarden } from "@/features/classic/garden";
import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { QuestionsControls } from "./controls";
import { QuestionsDrawer } from "./drawer";
import { missions } from "./missions";
import { GARDENS, LIMITS, scores, type QuestionsState } from "./model";
import { predictions } from "./predictions";
import { QuestionsScene } from "./scene";

export const definition = defineModule<QuestionsState>({
  initialState: { garden: "moons", points: plantGarden("moons"), brush: 0, depth: 3, smallest: 1 },
  scene: QuestionsScene,
  controls: QuestionsControls,
  captions,
  missions,
  predictions,
  underTheHood: QuestionsDrawer,
  // Two questions is the clear alternative; when that is already the setting, ask eight.
  compare: (state) => ({ ...state, depth: state.depth === 2 ? 8 : 2 }),
  parseState: (saved, initial) => ({
    ...parseGarden(saved, GARDENS, initial.garden, PULL + 1),
    depth: clampWhole(saved.depth, LIMITS.depth.min, LIMITS.depth.max),
    smallest: clampWhole(saved.smallest, LIMITS.smallest.min, LIMITS.smallest.max),
  }),
  describe: (state) => {
    if (state.points.length === 0) return words.describe.empty;
    const { own, fresh, boxes, asked } = scores(state);
    return words.describe.tree(
      count(asked),
      count(boxes),
      outOf(own, { noun: "" }),
      fresh === null ? null : outOf(fresh, { noun: "" }),
    );
  },
});

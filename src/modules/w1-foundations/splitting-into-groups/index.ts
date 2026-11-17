import { count } from "@/design/copy";
import { capList, clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { SplitControls } from "./controls";
import { SplitDrawer } from "./drawer";
import { missions } from "./missions";
import {
  canSplit,
  ERASER,
  GARDENS,
  isFinished,
  keyOf,
  MAX_POINTS,
  plant,
  type SplitFrame,
  type SplitState,
} from "./model";
import { predictions } from "./predictions";
import { SplitScene } from "./scene";

const MOST_RUNS = 10_000;

type Flower = SplitState["points"][number];
const isPoint = (item: unknown): item is Flower => {
  const point = item as Partial<Flower> | null;
  return (
    typeof point?.x === "number" &&
    typeof point.y === "number" &&
    Math.abs(point.x) <= 1 &&
    Math.abs(point.y) <= 1 &&
    (point.label === 0 || point.label === 1)
  );
};

export const definition = defineModule<SplitState, SplitFrame>({
  initialState: {
    points: plant("apart"),
    garden: "apart",
    brush: 0,
    step: 0.3,
    practice: 0.5,
    runs: 0,
    lens: { x: 0, y: 0 },
  },
  scene: SplitScene,
  controls: SplitControls,
  captions,
  missions,
  predictions,
  underTheHood: SplitDrawer,
  compare: (state) => ({ ...state, step: 0 }),
  // A link's flowers stay in the field and few enough, its dials on their dials.
  parseState: (saved, initial) => ({
    points: capList(saved.points, MAX_POINTS, isPoint),
    garden: oneOf(saved.garden, GARDENS, initial.garden),
    brush: clampWhole(saved.brush, 0, ERASER),
    step: clampNumber(saved.step, 0, 1),
    practice: clampNumber(saved.practice, 0, 1),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
    lens: {
      x: clampNumber(Number(saved.lens.x) || 0, -1, 1),
      y: clampNumber(Number(saved.lens.y) || 0, -1, 1),
    },
  }),
  describe: (state, frame) => {
    const total = state.points.length;
    if (total === 0) return words.describe.empty;
    if (state.runs === 0 || !canSplit(state.points))
      return words.describe.waiting(words.lens.flowers(count(total), total === 1));
    if (!frame || frame.key !== keyOf(state)) return words.describe.working;
    return isFinished(state, frame)
      ? words.describe.fenced(count(frame.right), count(total))
      : words.describe.working;
  },
  trains: true,
});

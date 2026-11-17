import { count } from "@/design/copy";
import { capList, clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { LineControls } from "./controls";
import { LineDrawer } from "./drawer";
import { missions } from "./missions";
import {
  allDots,
  isFinished,
  isThisWalk,
  MAX_ADDED,
  meanMiss,
  type Dot,
  type LineFrame,
  type LineState,
} from "./model";
import { predictions } from "./predictions";
import { LineScene, missWord } from "./scene";

const MOST_RUNS = 10_000;
const onField = (value: unknown) => clampNumber(Number(value) || 0, -1, 1);
const isDot = (item: unknown): item is Dot => {
  const dot = item as Partial<Dot> | null;
  return typeof dot?.x === "number" && typeof dot.y === "number";
};

export const definition = defineModule<LineState, LineFrame>({
  initialState: {
    line: { left: 0.5, right: -0.4 },
    added: [],
    spread: 0.25,
    dots: 0.4,
    runs: 0,
  },
  scene: LineScene,
  controls: LineControls,
  captions,
  missions,
  predictions,
  underTheHood: LineDrawer,
  compare: (state) => ({ ...state, added: [] }),
  parseState: (saved) => ({
    line: { left: onField(saved.line.left), right: onField(saved.line.right) },
    added: capList(saved.added, MAX_ADDED, isDot).map(({ x, y }) => ({
      x: onField(x),
      y: onField(y),
    })),
    spread: clampNumber(saved.spread, 0, 1),
    dots: clampNumber(saved.dots, 0, 1),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (isThisWalk(state, frame) && !isFinished(state, frame)) return words.describe.walking;
    if (!isFinished(state, frame))
      return words.describe.line(missWord(meanMiss(allDots(state), state.line)));
    const added = state.added.length;
    return words.describe.best(
      missWord(frame.loss),
      added === 0 ? words.describe.none : words.describe.addedDots(count(added), added === 1),
    );
  },
  trains: true,
});

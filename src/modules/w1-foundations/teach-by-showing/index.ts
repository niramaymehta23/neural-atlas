import { count, sentenceStart } from "@/design/copy";
import { capList, clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { TeachControls } from "./controls";
import { TeachDrawer } from "./drawer";
import { missions } from "./missions";
import {
  isCurrent,
  NEW_FRUIT,
  SHOWN,
  teachingFruit,
  wrongLabels,
  type Kind,
  type TeachFrame,
  type TeachState,
} from "./model";
import { predictions } from "./predictions";
import { TeachScene } from "./scene";

const MOST_RUNS = 10_000;
const isKind = (item: unknown): item is Kind => item === 0 || item === 1;

export const definition = defineModule<TeachState, TeachFrame>({
  initialState: { show: 0.4, messy: 0.15, baskets: [], runs: 0 },
  scene: TeachScene,
  controls: TeachControls,
  captions,
  missions,
  predictions,
  underTheHood: TeachDrawer,
  // The alternative: the same fruit, each in its own basket.
  compare: (state) => ({
    ...state,
    baskets: teachingFruit(state)
      .slice(0, state.baskets.length)
      .map(({ kind }) => kind),
  }),
  // Dials stay on their dials; never more baskets filled than fruit shown.
  parseState: (saved) => {
    const show = clampNumber(saved.show, 0, 1);
    const messy = clampNumber(saved.messy, 0, 1);
    return {
      show,
      messy,
      baskets: capList(
        saved.baskets,
        Math.min(SHOWN.max, teachingFruit({ show, messy }).length),
        isKind,
      ),
      runs: clampWhole(saved.runs, 0, MOST_RUNS),
    };
  },
  describe: (state, frame) => {
    const left = teachingFruit(state).length - state.baskets.length;
    if (left > 0) return sentenceStart(words.describe.sorting(count(left)));
    if (!isCurrent(state, frame)) return words.describe.waiting;
    const wrong = wrongLabels(state);
    return words.describe.tried(
      count(frame.right),
      count(NEW_FRUIT),
      wrong > 0 ? count(wrong) : null,
    );
  },
});

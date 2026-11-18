import { capList, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { ReadersControls } from "./controls";
import { ReadersDrawer } from "./drawer";
import { missions } from "./missions";
import {
  DEPTHS,
  lostSense,
  MOST_LETTERS,
  onReaders,
  READERS,
  type ReadersFrame,
  type ReadersState,
} from "./model";
import { predictions } from "./predictions";
import { ReadersScene } from "./scene";

const isReader = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= READERS;

export const definition = defineModule<ReadersState, ReadersFrame>({
  initialState: { sentence: words.example, depth: 1, off: [] },
  scene: ReadersScene,
  controls: ReadersControls,
  captions,
  missions,
  predictions,
  underTheHood: ReadersDrawer,
  compare: (state) => ({ ...state, off: [] }),
  parseState: (saved) => ({
    sentence: saved.sentence.slice(0, MOST_LETTERS),
    depth: clampWhole(saved.depth, 1, DEPTHS),
    off: [...new Set(capList(saved.off, READERS, isReader))],
  }),
  describe: (state, frame) => {
    if (!frame) return words.describe.waiting;
    const line = `${words.sense(frame.agree, frame.words)} ${lostSense(frame) ? words.lost : words.kept}`;
    return words.describe.done(onReaders(state.off).length, line);
  },
});

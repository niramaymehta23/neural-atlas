import { clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { MemoryControls } from "./controls";
import { MemoryDrawer } from "./drawer";
import { missions } from "./missions";
import { MOST_CHATTER, NAMES, PETS, WINDOW, type MemoryFrame, type MemoryState } from "./model";
import { predictions } from "./predictions";
import { MemoryScene } from "./scene";

export const definition = defineModule<MemoryState, MemoryFrame>({
  initialState: { pet: "dog", name: "maple", window: WINDOW.max, chatter: 2 },
  scene: MemoryScene,
  controls: MemoryControls,
  captions,
  missions,
  predictions,
  underTheHood: MemoryDrawer,
  compare: (state) => ({ ...state, window: WINDOW.max }),
  parseState: (saved) => ({
    pet: oneOf(saved.pet, PETS, "dog"),
    name: oneOf(saved.name, NAMES, "maple"),
    window: clampWhole(saved.window, WINDOW.min, WINDOW.max),
    chatter: clampWhole(saved.chatter, 0, MOST_CHATTER),
  }),
  describe: (state, frame) => {
    if (!frame) return words.describe.waiting;
    const answer = frame.answers[0]?.word ?? "";
    return words.describe.done(
      frame.inView ? words.inView(state.name) : words.gone(state.name),
      answer === state.name ? words.right(answer) : words.wrong(answer),
    );
  },
});

import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { BlockControls } from "./controls";
import { BlockDrawer } from "./drawer";
import { missions } from "./missions";
import { MOST_BLOCKS, type BlockFrame, type BlockState } from "./model";
import { predictions } from "./predictions";
import { BlockScene } from "./scene";

export const definition = defineModule<BlockState, BlockFrame>({
  initialState: { blocks: 3, strength: 0.5, shortcut: true },
  scene: BlockScene,
  controls: BlockControls,
  captions,
  missions,
  predictions,
  underTheHood: BlockDrawer,
  compare: (state) => ({ ...state, shortcut: !state.shortcut }),
  parseState: (saved) => ({
    blocks: clampWhole(saved.blocks, 1, MOST_BLOCKS),
    strength: clampNumber(saved.strength, 0.1, 1),
    shortcut: saved.shortcut,
  }),
  describe: (state, frame) =>
    words.describe(state.blocks, state.shortcut, words.alike(frame?.alike.at(-1) ?? 0)),
});

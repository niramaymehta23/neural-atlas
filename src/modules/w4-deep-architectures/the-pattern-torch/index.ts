import { clampNumber, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { SINGLE_PHOTOS } from "@/features/inside/use-photo";
import { captions, words } from "./captions";
import { TorchControls } from "./controls";
import { TorchDrawer } from "./drawer";
import { missions } from "./missions";
import { CELLS, presetOf, TORCHES, type Cell, type TorchFrame, type TorchState } from "./model";
import { predictions } from "./predictions";
import { foundWords, TorchScene } from "./scene";

const toCell = (value: unknown): Cell => (value === 1 || value === -1 ? value : 0);

export const definition = defineModule<TorchState, TorchFrame>({
  initialState: { photo: "cat", torch: [...TORCHES.upDown], sweep: 0, strict: 0.2 },
  scene: TorchScene,
  controls: TorchControls,
  captions,
  missions,
  predictions,
  underTheHood: TorchDrawer,
  // The same torch with light and dark swapped finds the opposite edges.
  compare: (state) => ({
    ...state,
    torch: state.torch.map((cell) => (cell === 0 ? 0 : -cell) as Cell),
  }),
  parseState: (saved, initial) => ({
    photo: oneOf(saved.photo, SINGLE_PHOTOS, initial.photo),
    torch: Array.from({ length: CELLS }, (_, index) =>
      Array.isArray(saved.torch) ? toCell(saved.torch[index]) : (initial.torch[index] ?? 0),
    ),
    sweep: clampNumber(saved.sweep, 0, 1),
    strict: clampNumber(saved.strict, 0, 1),
  }),
  describe: (state) =>
    words.describe(words.presets.names[presetOf(state.torch) ?? "own"], foundWords(state, null)),
});

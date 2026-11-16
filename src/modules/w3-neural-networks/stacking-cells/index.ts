import { freshCompanion } from "@/platform/companion/companion";
import { defineModule } from "@/platform/contract";
import { captions } from "./captions";
import { CellsControls } from "./controls";
import { CellsDrawer } from "./drawer";
import { missions } from "./missions";
import { plant, type CellsFrame, type CellsState } from "./model";
import { predictions } from "./predictions";
import { CellsScene } from "./scene";

export const definition = defineModule<CellsState, CellsFrame>({
  initialState: {
    points: plant("ring"),
    garden: "ring",
    // The learner's own network starts the size of a fresh companion: one layer of four cells.
    layers: freshCompanion.hidden.length,
    cells: freshCompanion.hidden[0] ?? 4,
    step: 0.3,
    brush: 1,
    learning: false,
    epochs: 0,
    attempt: 0,
  },
  scene: CellsScene,
  controls: CellsControls,
  captions,
  missions,
  predictions,
  underTheHood: CellsDrawer,
  compare: (state) => ({ ...state, layers: 1, cells: 1 }),
  trains: true,
});

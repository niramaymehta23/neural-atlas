import { freshCompanion } from "@/platform/companion/companion";
import { capList, clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions } from "./captions";
import { CellsControls } from "./controls";
import { CellsDrawer } from "./drawer";
import { missions } from "./missions";
import { GARDENS, LIMITS, plant, type CellsFrame, type CellsState } from "./model";
import { predictions } from "./predictions";
import { CellsScene } from "./scene";

/** A garden a link can bring: far more dots than painting by hand would plant. */
const MAX_POINTS = 600;
/** Practice a link can ask to replay before the view shows. */
const MAX_EPOCHS = 5000;
const isPoint = (item: unknown): item is CellsState["points"][number] => {
  const point = item as Partial<CellsState["points"][number]> | null;
  return (
    typeof point?.x === "number" &&
    typeof point.y === "number" &&
    Math.abs(point.x) <= 1 &&
    Math.abs(point.y) <= 1 &&
    (point.label === 0 || point.label === 1)
  );
};

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
  // A link's dials stay on their dials; the garden and the practice to replay stay small.
  parseState: (saved, initial) => ({
    ...saved,
    points: capList(saved.points, MAX_POINTS, isPoint),
    garden: oneOf(saved.garden, GARDENS, initial.garden),
    layers: clampWhole(saved.layers, LIMITS.layers.min, LIMITS.layers.max),
    cells: clampWhole(saved.cells, LIMITS.cells.min, LIMITS.cells.max),
    step: clampNumber(saved.step, 0, 1),
    brush: clampWhole(saved.brush, 0, 1),
    epochs: clampWhole(saved.epochs, 0, MAX_EPOCHS),
    attempt: clampWhole(saved.attempt, 0, 1_000_000),
  }),
  // The lesson opens on the learner's own network: its layers, and the cells of its first one.
  initialFrom: (companion, initial) => ({
    ...initial,
    layers: clampWhole(companion.hidden.length, LIMITS.layers.min, LIMITS.layers.max),
    cells: clampWhole(companion.hidden[0] ?? initial.cells, LIMITS.cells.min, LIMITS.cells.max),
  }),
  trains: true,
});

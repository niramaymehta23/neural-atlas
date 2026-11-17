import { count } from "@/design/copy";
import { freshCompanion } from "@/platform/companion/companion";
import { capList, clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { CellsControls } from "./controls";
import { CellsDrawer } from "./drawer";
import { missions } from "./missions";
import {
  BENDS,
  ERASER,
  GARDENS,
  isThisRun,
  LIMITS,
  MAX_POINTS,
  plant,
  rightCount,
  teamSize,
  type Bend,
  type CellsFrame,
  type CellsState,
  type Change,
} from "./model";
import { predictions } from "./predictions";
import { CellsScene } from "./scene";

/** Practice a link can ask to replay before the view shows (ENG-09). */
const MAX_EPOCHS = 5000;
/** Changes a link can carry; a longer log is too long for a link anyway. */
const MAX_LOG = 2000;

type Garden = CellsState["points"];
type Flower = Garden[number];

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

const isWhole = (value: unknown, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;

/** A log entry a link may carry: well-formed, and at a round no later than the link's own. */
function isChange(epochs: number) {
  return (item: unknown): item is Change => {
    const change = item as Record<string, unknown> | null;
    if (!change || !isWhole(change.epoch, epochs) || change.epoch === 0) return false;
    if ("step" in change)
      return [change.step, change.was].every(
        (value) => typeof value === "number" && value >= 0 && value <= 1,
      );
    if ("added" in change)
      return Array.isArray(change.added) && change.added.length > 0 && change.added.every(isPoint);
    if ("removed" in change)
      return (
        Array.isArray(change.removed) &&
        change.removed.length > 0 &&
        change.removed.every(
          (gone: { at?: unknown; point?: unknown }) =>
            isWhole(gone?.at, MAX_POINTS) && isPoint(gone.point),
        )
      );
    return false;
  };
}

/**
 * True when the log can be worked back from the garden it ends on: every planting is still at
 * the end, every pull-up fits, and the rounds never go backwards.
 */
function logFits(points: Garden, log: readonly Change[]): boolean {
  const same = (a?: Flower, b?: Flower) => a?.x === b?.x && a?.y === b?.y && a?.label === b?.label;
  let garden = [...points];
  let last = Infinity;
  for (const change of [...log].reverse()) {
    if (change.epoch > last) return false;
    last = change.epoch;
    if ("added" in change) {
      const tail = garden.slice(garden.length - change.added.length);
      if (tail.length !== change.added.length) return false;
      if (!tail.every((point, index) => same(point, change.added[index]))) return false;
      garden = garden.slice(0, garden.length - change.added.length);
    } else if ("removed" in change) {
      for (const { at, point } of [...change.removed].reverse()) {
        if (at > garden.length) return false;
        garden.splice(at, 0, point);
      }
      if (garden.length > MAX_POINTS) return false;
    }
  }
  return true;
}

export const definition = defineModule<CellsState, CellsFrame>({
  initialState: {
    points: plant("ring"),
    garden: "ring",
    // The learner's own network starts the size of a fresh companion: one layer of four cells.
    layers: freshCompanion.hidden.length,
    cells: freshCompanion.hidden[0] ?? 4,
    bends: Array.from({ length: LIMITS.layers.max }, () => "tanh" as const),
    step: 0.3,
    brush: 1,
    learning: false,
    epochs: 0,
    attempt: 0,
    log: [],
  },
  scene: CellsScene,
  controls: CellsControls,
  captions,
  missions,
  predictions,
  underTheHood: CellsDrawer,
  compare: (state) => ({ ...state, layers: 1, cells: 1 }),
  // A link's dials stay on their dials; the garden, the practice to replay and its log stay
  // small and consistent. A link opens paused, on the moment it was shared.
  parseState: (saved, initial) => {
    const points = capList(saved.points, MAX_POINTS, isPoint);
    const epochs = clampWhole(saved.epochs, 0, MAX_EPOCHS);
    const log = capList(Array.isArray(saved.log) ? saved.log : [], MAX_LOG, isChange(epochs));
    const fits =
      log.length === (Array.isArray(saved.log) ? saved.log.length : 0) && logFits(points, log);
    return {
      points,
      garden: oneOf(saved.garden, GARDENS, initial.garden),
      layers: clampWhole(saved.layers, LIMITS.layers.min, LIMITS.layers.max),
      cells: clampWhole(saved.cells, LIMITS.cells.min, LIMITS.cells.max),
      bends: initial.bends.map((bend, index) =>
        oneOf(Array.isArray(saved.bends) ? saved.bends[index] : undefined, BENDS, bend),
      ),
      step: clampNumber(saved.step, 0, 1),
      brush: clampWhole(saved.brush, 0, ERASER),
      learning: false,
      // A log that does not fit cannot be replayed faithfully: start that garden afresh.
      epochs: fits ? epochs : 0,
      attempt: clampWhole(saved.attempt, 0, 1_000_000),
      log: fits ? log : [],
    };
  },
  // The lesson opens on the learner's own network: its layers, the cells of its first one, its bend.
  initialFrom: (companion, initial) => {
    const bend: Bend = oneOf(companion.activation, BENDS, "tanh");
    return {
      ...initial,
      layers: clampWhole(companion.hidden.length, LIMITS.layers.min, LIMITS.layers.max),
      cells: clampWhole(companion.hidden[0] ?? initial.cells, LIMITS.cells.min, LIMITS.cells.max),
      bends: initial.bends.map(() => bend),
    };
  },
  describe: (state, frame) => {
    if (state.points.length === 0) return words.describe.empty;
    const size = teamSize(state);
    const team = words.describe.team(count(size), size === 1);
    if (!isThisRun(state, frame) || frame.epoch === 0) return words.describe.untrained(team);
    // While it practises the sentence would change ten times a second: it waits for a pause.
    if (state.learning) return words.describe.learning(team);
    return words.describe.practised(
      team,
      count(frame.epoch),
      count(rightCount(state, frame.params)),
      count(state.points.length),
    );
  },
  trains: true,
});

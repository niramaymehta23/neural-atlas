import { count } from "@/design/copy";
import { parseDots } from "@/features/classic/garden";
import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { NeighboursControls } from "./controls";
import { NeighboursDrawer } from "./drawer";
import { missions } from "./missions";
import { ASK, familyVote, GARDENS, LIMITS, plantTown, type NeighboursState } from "./model";
import { predictions } from "./predictions";
import { NeighboursScene } from "./scene";

const isSpot = (value: unknown): value is { x: number; y: number } => {
  const spot = value as { x?: unknown; y?: unknown } | null;
  return (
    typeof spot?.x === "number" && typeof spot.y === "number" && Number.isFinite(spot.x + spot.y)
  );
};

const asked = (neighbours: number) =>
  neighbours === 1 ? words.neighbours.one : words.neighbours.many(count(neighbours));

export const definition = defineModule<NeighboursState>({
  initialState: {
    garden: "town",
    points: plantTown("town"),
    brush: ASK,
    neighbours: 3,
    closeness: 0,
    family: null,
  },
  scene: NeighboursScene,
  controls: NeighboursControls,
  captions,
  missions,
  predictions,
  underTheHood: NeighboursDrawer,
  // Asking one neighbour is the clear alternative; when that is already the setting, ask nine.
  compare: (state) => ({ ...state, neighbours: state.neighbours === 1 ? 9 : 1 }),
  // A link's dials stay on their dials, its town small and well-formed, the family on the map.
  parseState: (saved, initial) => ({
    garden: oneOf(saved.garden, GARDENS, initial.garden),
    points: parseDots(saved.points),
    brush: clampWhole(saved.brush, 0, ASK),
    neighbours: clampWhole(saved.neighbours, LIMITS.neighbours.min, LIMITS.neighbours.max),
    closeness: clampNumber(saved.closeness, 0, 1),
    family: isSpot(saved.family)
      ? { x: clampNumber(saved.family.x, -1, 1), y: clampNumber(saved.family.y, -1, 1) }
      : null,
  }),
  describe: (state) => {
    if (state.points.length === 0) return words.describe.empty;
    const vote = familyVote(state);
    if (!vote) return words.describe.map(asked(state.neighbours));
    return words.describe.asked(
      asked(vote.neighbours.length),
      words.team[vote.winner] ?? words.team[0],
    );
  },
});

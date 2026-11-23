import { capList, clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { CasinoControls } from "./controls";
import { CasinoDrawer } from "./drawer";
import { missions } from "./missions";
import {
  BUDGET,
  CURIOUS,
  isFinished,
  MACHINES,
  NEVER,
  yourResults,
  YOUR_PULLS,
  type CasinoState,
  type RaceFrame,
} from "./model";
import { predictions } from "./predictions";
import { CasinoScene } from "./scene";

const MOST_RACES = 10_000;
const MOST_PLAYS = 100_000;

const isMachine = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MACHINES.length;

export const definition = defineModule<CasinoState, RaceFrame>({
  initialState: { pulls: [], plays: 0, curious: CURIOUS.start, budget: BUDGET.start, races: 0 },
  scene: CasinoScene,
  controls: CasinoControls,
  captions,
  missions,
  predictions,
  underTheHood: CasinoDrawer,
  // No curiosity against the starting curiosity.
  compare: (state) => ({ ...state, curious: state.curious < NEVER ? CURIOUS.start : 0 }),
  parseState: (saved) => ({
    pulls: capList(saved.pulls, YOUR_PULLS, isMachine),
    plays: clampWhole(saved.plays, 0, MOST_PLAYS),
    curious: clampNumber(saved.curious, CURIOUS.min, CURIOUS.max),
    budget:
      Math.round(clampNumber(saved.budget, BUDGET.min, BUDGET.max) / BUDGET.step) * BUDGET.step,
    races: clampWhole(saved.races, 0, MOST_RACES),
  }),
  describe: (state, frame) => {
    const results = yourResults(state);
    const yours = words.describe.yours(results.length, results.filter(({ won }) => won).length);
    if (state.races === 0) return `${yours} ${words.describe.waiting}`;
    if (!isFinished(state, frame)) return `${yours} ${words.describe.racing}`;
    return `${yours} ${words.describe.done(frame.bots[0].wins, frame.bots[1].wins)}`;
  },
  trains: true,
});

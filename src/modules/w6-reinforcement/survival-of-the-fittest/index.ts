import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { RaceControls } from "./controls";
import { RaceDrawer } from "./drawer";
import { missions } from "./missions";
import {
  CARS,
  cleanRoad,
  DEFAULT_CARS,
  DEFAULT_CHANGE,
  isFinished,
  TRACKS,
  WILD_CHANGE,
  type RaceFrame,
  type RaceState,
} from "./model";
import { predictions } from "./predictions";
import { furthestLine, RaceScene } from "./scene";

const MOST_RUNS = 10_000;
const MOST_ATTEMPTS = 1_000;

export const definition = defineModule<RaceState, RaceFrame>({
  initialState: {
    road: TRACKS.twisty,
    brush: "road",
    change: DEFAULT_CHANGE,
    cars: DEFAULT_CARS,
    attempt: 0,
    runs: 0,
  },
  scene: RaceScene,
  controls: RaceControls,
  captions,
  missions,
  predictions,
  underTheHood: RaceDrawer,
  // The other end of the change dial: nearly brand-new cars, or small changes for wild ones.
  compare: (state) => ({
    ...state,
    change: state.change >= WILD_CHANGE ? DEFAULT_CHANGE : 1,
  }),
  // The track keeps its size and its start; dials stay on their dials.
  parseState: (saved, initial) => ({
    road: cleanRoad(typeof saved.road === "string" ? saved.road : initial.road),
    brush: oneOf(saved.brush, ["road", "grass"] as const, initial.brush),
    change: clampNumber(saved.change, 0, 1),
    cars: clampWhole(saved.cars, CARS.min, CARS.max),
    attempt: clampWhole(saved.attempt, 0, MOST_ATTEMPTS),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(furthestLine(frame));
  },
  trains: true,
});

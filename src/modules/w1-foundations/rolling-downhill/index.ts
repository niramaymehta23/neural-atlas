import { capList, clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { DownhillControls } from "./controls";
import { DownhillDrawer } from "./drawer";
import { missions } from "./missions";
import {
  dialFor,
  STEPS,
  VALLEYS,
  WALKERS,
  type DownhillFrame,
  type DownhillState,
  type Spot,
} from "./model";
import { predictions } from "./predictions";
import { DownhillScene } from "./scene";

const MOST_RUNS = 10_000;
const onGround = (value: unknown) => clampNumber(Number(value) || 0, -1, 1);
const isSpot = (value: unknown): value is Spot =>
  typeof value === "object" && value !== null && "x" in value && "z" in value;

/** A gentle step everyone can compare their own against. */
const SMALL_STEP = dialFor(0.15);

export const definition = defineModule<DownhillState, DownhillFrame>({
  initialState: {
    valley: "bowl",
    step: dialFor(0.2),
    keepRolling: 0.9,
    start: { x: 0.75, z: 0.6 },
    runs: 0,
    marks: [],
    marksFor: 0,
  },
  scene: DownhillScene,
  controls: DownhillControls,
  captions,
  missions,
  predictions,
  underTheHood: DownhillDrawer,
  compare: (state) => ({ ...state, step: SMALL_STEP }),
  // A link's dials stay on their dials, the start on the ground, the run count sane.
  parseState: (saved, initial) => ({
    valley: oneOf(saved.valley, VALLEYS, initial.valley),
    step: clampNumber(saved.step, 0, 1),
    keepRolling: clampNumber(saved.keepRolling, 0, 1),
    start: { x: onGround(saved.start.x), z: onGround(saved.start.z) },
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
    marks: capList(saved.marks, WALKERS.length, isSpot).map(({ x, z }) => ({
      x: onGround(x),
      z: onGround(z),
    })),
    marksFor: clampWhole(saved.marksFor, 0, MOST_RUNS + 1),
  }),
  describe: (state, frame) => {
    if (state.runs === 0 || !frame) return words.describe.waiting;
    if (frame.epoch < STEPS) return words.describe.moving;
    const parts = WALKERS.map((walker, index) => {
      const name = words.names[walker];
      if (frame.walkers[index]?.off) return words.describe.off(name);
      return frame.settled[index] === null
        ? words.describe.still(name)
        : words.describe.settled(name);
    });
    return words.describe.ended(parts.join(", "));
  },
  trains: true,
});

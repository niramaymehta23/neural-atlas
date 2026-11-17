import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions } from "./captions";
import { DownhillControls } from "./controls";
import { DownhillDrawer } from "./drawer";
import { missions } from "./missions";
import { dialFor, VALLEYS, type DownhillFrame, type DownhillState } from "./model";
import { predictions } from "./predictions";
import { DownhillScene } from "./scene";

/** A gentle step everyone can compare their own against. */
const SMALL_STEP = dialFor(0.15);

export const definition = defineModule<DownhillState, DownhillFrame>({
  initialState: {
    valley: "bowl",
    step: dialFor(0.2),
    keepRolling: 0.9,
    start: { x: 0.75, z: 0.6 },
    runs: 0,
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
    start: {
      x: clampNumber(Number(saved.start.x) || 0, -1, 1),
      z: clampNumber(Number(saved.start.z) || 0, -1, 1),
    },
    runs: clampWhole(saved.runs, 0, 10_000),
  }),
  trains: true,
});

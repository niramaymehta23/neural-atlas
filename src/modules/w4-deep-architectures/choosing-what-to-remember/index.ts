import { count } from "@/design/copy";
import { LENGTH, memoryOf, rightWith } from "@/features/memory/run";
import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { GatesControls } from "./controls";
import { GatesDrawer } from "./drawer";
import { missions } from "./missions";
import {
  CELLS,
  GATE_MODES,
  gatesOf,
  isFinished,
  STARTS,
  type GatesFrame,
  type GatesState,
} from "./model";
import { predictions } from "./predictions";
import { GatesScene } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<GatesState, GatesFrame>({
  initialState: {
    length: 14,
    step: 0.4,
    start: "sunny",
    keep: "auto",
    letIn: "auto",
    readOut: "auto",
    cell: "gated",
    runs: 0,
  },
  scene: GatesScene,
  controls: GatesControls,
  captions,
  missions,
  predictions,
  underTheHood: GatesDrawer,
  compare: (state) => ({ ...state, cell: state.cell === "gated" ? "plain" : "gated" }),
  parseState: (saved, initial) => ({
    length: clampWhole(saved.length, LENGTH.min, LENGTH.max),
    step: clampNumber(saved.step, 0, 1),
    start: oneOf(saved.start, STARTS, initial.start),
    keep: oneOf(saved.keep, GATE_MODES, initial.keep),
    letIn: oneOf(saved.letIn, GATE_MODES, initial.letIn),
    readOut: oneOf(saved.readOut, GATE_MODES, initial.readOut),
    cell: oneOf(saved.cell, CELLS, initial.cell),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    const length = words.length.words(count(state.length));
    if (state.runs === 0) return words.describe.waiting(length);
    if (!isFinished(state, frame)) return words.describe.working;
    const right = rightWith(state.cell, frame.params, state.length, gatesOf(state));
    return words.describe.done(length, words.memory[memoryOf(right)]);
  },
  trains: true,
});

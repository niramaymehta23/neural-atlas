/**
 * Choosing what to remember: a gated (LSTM) reader practises remembering a sentence's first word
 * across long sentences, which a plain reader cannot. The learner can then force each gate open or
 * shut on the trained reader, without practising again.
 */
import type { Cell, GateMode, Gates } from "@/engine/sequence/recurrent";
import { memoryRun, type MemoryFrame } from "@/features/memory/run";

export const STARTS = ["sunny", "rainy"] as const;
export type Start = (typeof STARTS)[number];
export const GATE_MODES = ["auto", "open", "shut"] as const satisfies readonly GateMode[];
export const CELLS = ["gated", "plain"] as const satisfies readonly Cell[];

export type GatesState = {
  /** "How long the sentence is", in words. */
  length: number;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** Which version of the sentence the strip shows. */
  start: Start;
  keep: GateMode;
  letIn: GateMode;
  readOut: GateMode;
  /** "gated" in the lesson; "plain" on the compare split's other side. */
  cell: Cell;
  /** Practice runs asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

export type GatesFrame = MemoryFrame;

export const gatesOf = ({ keep, letIn, readOut }: GatesState): Gates => ({ keep, letIn, readOut });

/** The gates do not change what it practises, so they are not part of a run's key. */
export const keyOf = ({ cell, length, step }: Pick<GatesState, "cell" | "length" | "step">) =>
  `${cell}|${length}|${step}`;

export const gatesRun = (state: GatesState) =>
  memoryRun(state.cell, state.length, state.step, keyOf(state));

export const isFinished = (state: GatesState, frame: GatesFrame | undefined): frame is GatesFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

export const allShut = (state: GatesState) =>
  state.keep === "shut" && state.letIn === "shut" && state.readOut === "shut";

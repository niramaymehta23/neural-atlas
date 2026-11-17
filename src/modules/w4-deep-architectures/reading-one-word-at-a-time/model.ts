/**
 * Reading one word at a time: a plain recurrent reader practises remembering a sentence's first
 * word (sunny or rainy) until the end. Short sentences it learns; long ones it cannot, because the
 * blame from the answer fades away before it reaches the first word.
 */
import { memoryRun, type MemoryFrame } from "@/features/memory/run";

export const STARTS = ["sunny", "rainy"] as const;
export type Start = (typeof STARTS)[number];

export type ReadingState = {
  /** "How long the sentence is", in words. */
  length: number;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** Which version of the sentence the strip shows. */
  start: Start;
  /** Practice runs asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

export type ReadingFrame = MemoryFrame;

export const keyOf = ({ length, step }: Pick<ReadingState, "length" | "step">) =>
  `plain|${length}|${step}`;

export const readingRun = (state: ReadingState) =>
  memoryRun("plain", state.length, state.step, keyOf(state));

export const isFinished = (
  state: ReadingState,
  frame: ReadingFrame | undefined,
): frame is ReadingFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

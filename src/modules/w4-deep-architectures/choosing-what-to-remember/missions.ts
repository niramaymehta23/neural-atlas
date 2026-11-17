import { GUESSING, rightWith } from "@/features/memory/run";
import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { allShut, gatesOf, isFinished, type GatesFrame, type GatesState } from "./model";

export const missions = [
  {
    id: "lock-every-gate",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // The practised gated reader, every gate forced shut, only guessing on new sentences.
    when: (state, frame) =>
      isFinished(state, frame) &&
      state.cell === "gated" &&
      allShut(state) &&
      rightWith("gated", frame.params, state.length, gatesOf(state)) < GUESSING,
  },
] as const satisfies readonly [Mission<GatesState, GatesFrame>];

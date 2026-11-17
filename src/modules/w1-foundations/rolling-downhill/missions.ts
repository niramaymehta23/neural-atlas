import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { steadyFlewOff, steadyOffAt, type DownhillFrame, type DownhillState } from "./model";

export const missions = [
  {
    id: "fly-off",
    ...missionWords,
    // Replayed slowly around the step the steady walker left, so each overshoot can be seen.
    replay: { before: 10, after: 16, framesPerSecond: 8, moment: steadyOffAt },
    // Only the steady walker's own steps count: a rolling ball can roll off with small steps (DH-04).
    when: (_state, frame) => steadyFlewOff(frame),
  },
] as const satisfies readonly [Mission<DownhillState, DownhillFrame>];

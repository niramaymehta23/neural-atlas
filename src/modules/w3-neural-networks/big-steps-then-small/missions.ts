import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, planEnding, type PlanFrame, type PlanState } from "./model";

export const missions = [
  {
    id: "stops-short",
    ...missionWords,
    replay: { before: 40, after: 0, framesPerSecond: 15 },
    when: (state, frame) => isFinished(state, frame) && planEnding(state.plan) === "short",
  },
] as const satisfies readonly [Mission<PlanState, PlanFrame>];

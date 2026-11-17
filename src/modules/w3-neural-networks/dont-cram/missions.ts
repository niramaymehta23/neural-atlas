import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, learnedNothing, type CramFrame, type CramState } from "./model";

export const missions = [
  {
    id: "learns-nothing",
    ...missionWords,
    replay: { before: 40, after: 0, framesPerSecond: 15 },
    when: (state, frame) => isFinished(state, frame) && learnedNothing(frame),
  },
] as const satisfies readonly [Mission<CramState, CramFrame>];

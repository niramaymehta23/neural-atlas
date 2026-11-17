import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { allCopies, isFinished, type StartFrame, type StartState } from "./model";

export const missions = [
  {
    id: "all-copies",
    ...missionWords,
    replay: { before: 30, after: 0, framesPerSecond: 15 },
    when: (state, frame) => isFinished(state, frame) && allCopies(state.cells, frame.params),
  },
] as const satisfies readonly [Mission<StartState, StartFrame>];

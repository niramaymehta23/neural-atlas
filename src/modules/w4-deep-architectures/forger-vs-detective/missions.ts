import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, ONE_FACE, type DuelFrame, type DuelState } from "./model";

export const missions = [
  {
    id: "one-face",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // A finished duel whose fakes nearly all land in one place: the same face every time.
    when: (state, frame) => isFinished(state, frame) && frame.bunched >= ONE_FACE,
  },
] as const satisfies readonly [Mission<DuelState, DuelFrame>];

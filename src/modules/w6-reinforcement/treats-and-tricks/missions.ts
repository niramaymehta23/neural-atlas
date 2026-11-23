import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isNow, learnedWrongTrick, type TreatsFrame, type TreatsState } from "./model";

export const missions = [
  {
    id: "wrong-trick",
    ...missionWords,
    replay: { before: 10, after: 0 },
    // The newest round is on screen, and it does a rewarded trick that isn't sit most of the time.
    when: (state, frame) => isNow(state, frame) && learnedWrongTrick(frame),
  },
] as const satisfies readonly [Mission<TreatsState, TreatsFrame>];

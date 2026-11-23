import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { goneWild, isFinished, WILD, type HabitFrame, type HabitState } from "./model";

export const missions = [
  {
    id: "gone-wild",
    ...missionWords,
    replay: { before: 300, after: 0 },
    // A finished run at the hardest nudges whose habits locked onto moves that rarely work.
    when: (state, frame) => state.nudge >= WILD && isFinished(state, frame) && goneWild(frame),
  },
] as const satisfies readonly [Mission<HabitState, HabitFrame>];

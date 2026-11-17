import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { FAINT, matches, type SeeFrame, type SeeState } from "./model";

export const missions = [
  {
    id: "faint-smudge",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // A smudge too faint to see changed the AI's answer.
    when: (state, frame) =>
      state.smudge && state.strength <= FAINT && matches(state, frame) && frame.fooled === true,
  },
] as const satisfies readonly [Mission<SeeState, SeeFrame>];

import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { ENOUGH_EACH, isFinished, NO_FENCE, type SplitFrame, type SplitState } from "./model";

const eachHasEnough = ({ points }: SplitState) =>
  [0, 1].every((group) => points.filter(({ label }) => label === group).length >= ENOUGH_EACH);

export const missions = [
  {
    id: "no-straight-fence",
    ...missionWords,
    replay: { before: 30, after: 0 },
    // A finished fence on these very flowers, with plenty of both kinds, that still gets a lot wrong.
    when: (state, frame) =>
      isFinished(state, frame) &&
      eachHasEnough(state) &&
      frame.right / state.points.length < NO_FENCE,
  },
] as const satisfies readonly [Mission<SplitState, SplitFrame>];

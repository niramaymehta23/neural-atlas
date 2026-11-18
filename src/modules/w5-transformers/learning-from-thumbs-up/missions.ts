import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import type { ThumbsFrame, ThumbsState } from "./model";

export const missions = [
  {
    id: "yes-man",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined && frame.picks.length === state.picks.length && frame.yesMan,
  },
] as const satisfies readonly [Mission<ThumbsState, ThumbsFrame>];

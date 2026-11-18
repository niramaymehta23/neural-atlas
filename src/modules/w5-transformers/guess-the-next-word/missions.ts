import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import type { NextFrame, NextState } from "./model";

export const missions = [
  {
    id: "round-in-circles",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.start === state.start &&
      frame.added === state.added &&
      frame.likeliest === state.likeliest &&
      frame.seed === state.seed &&
      frame.circles,
  },
] as const satisfies readonly [Mission<NextState, NextFrame>];

import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { unnoticed, type OrderFrame, type OrderState } from "./model";

export const missions = [
  {
    id: "shuffle-unnoticed",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.sentence === state.sentence &&
      frame.strength === state.strength &&
      frame.speed === state.speed &&
      unnoticed(frame),
  },
] as const satisfies readonly [Mission<OrderState, OrderFrame>];

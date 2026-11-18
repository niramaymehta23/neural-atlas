import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { wrongBook, type LookFrame, type LookState } from "./model";

export const missions = [
  {
    id: "wrong-book",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.question === state.question &&
      frame.handed === state.handed &&
      frame.lookUp === state.lookUp &&
      wrongBook(frame),
  },
] as const satisfies readonly [Mission<LookState, LookFrame>];

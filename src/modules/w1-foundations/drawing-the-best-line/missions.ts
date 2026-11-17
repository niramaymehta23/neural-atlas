import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import {
  crazyDots,
  isFinished,
  moveFromAdded,
  TILTED,
  type LineFrame,
  type LineState,
} from "./model";

export const missions = [
  {
    id: "crazy-dot",
    ...missionWords,
    replay: { before: 40, after: 0, framesPerSecond: 15 },
    // The best line for these very dots, which include a crazy one, tilted well away from the
    // line through the lesson's own dots.
    when: (state, frame) =>
      isFinished(state, frame) &&
      crazyDots(state).length > 0 &&
      moveFromAdded(state, frame).tilt >= TILTED,
  },
] as const satisfies readonly [Mission<LineState, LineFrame>];

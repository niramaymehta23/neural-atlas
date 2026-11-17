import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import {
  GENTLE_POWER,
  ignoresRare,
  isFinished,
  power,
  type ScoreFrame,
  type ScoreState,
} from "./model";

export const missions = [
  {
    id: "gentle-scorer",
    ...missionWords,
    replay: { before: 30, after: 0, framesPerSecond: 15 },
    // A finished walk under a gentle scorer that runs through the main group and leaves every
    // dot of the rare group far off.
    when: (state, frame) =>
      isFinished(state, frame) && power(state.strict) <= GENTLE_POWER && ignoresRare(state, frame),
  },
] as const satisfies readonly [Mission<ScoreState, ScoreFrame>];

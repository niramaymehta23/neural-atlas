import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import {
  answered,
  appleChance,
  isNonsense,
  sureness,
  VERY_SURE,
  type ForwardFrame,
  type ForwardState,
} from "./model";

export const missions = [
  {
    id: "nonsense",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // A finished thought about something no fruit could be, answered very sure.
    when: (state) =>
      answered(state) && isNonsense(state) && sureness(appleChance(state)) >= VERY_SURE,
  },
] as const satisfies readonly [Mission<ForwardState, ForwardFrame>];

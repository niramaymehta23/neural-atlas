import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { matches, type MapFrame, type MapState } from "./model";

export const missions = [
  {
    id: "torn-map",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // The untidy map, with the marker on a picture that is nonsense.
    when: (state, frame) => matches(state, frame) && state.tidy === 0 && frame.nonsense,
  },
] as const satisfies readonly [Mission<MapState, MapFrame>];

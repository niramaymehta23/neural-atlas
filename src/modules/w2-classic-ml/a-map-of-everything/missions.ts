import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { islandsFromNoise, type MapFrame, type MapState } from "./model";

export const missions = [
  {
    id: "islands-from-noise",
    ...missionWords.fakeIslands,
    replay: { before: 30, after: 0 },
    when: (state, frame) => islandsFromNoise(state, frame),
  },
] as const satisfies readonly [Mission<MapState, MapFrame>, ...Mission<MapState, MapFrame>[]];

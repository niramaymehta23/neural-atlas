import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, squashed, type MapFrame, type MapState } from "./model";

export const missions = [
  {
    id: "one-spot",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // A finished map whose picked words all sit in one spot.
    when: (state, frame) => isFinished(state, frame) && squashed(frame),
  },
] as const satisfies readonly [Mission<MapState, MapFrame>];

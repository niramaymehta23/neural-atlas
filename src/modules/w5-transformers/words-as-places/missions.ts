import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { landsOnStart, type PlacesFrame, type PlacesState } from "./model";

export const missions = [
  {
    id: "lands-on-start",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // The frame must show the state on screen, so an old frame never earns the star.
    when: (state, frame) =>
      frame !== undefined &&
      frame.from === state.from &&
      frame.minus === state.minus &&
      frame.plus === state.plus &&
      frame.amount === state.amount &&
      frame.skip === state.skip &&
      landsOnStart(frame),
  },
] as const satisfies readonly [Mission<PlacesState, PlacesFrame>];

import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { gibberish, type SamplingFrame, type SamplingState } from "./model";

export const missions = [
  {
    id: "wild-gibberish",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.start === state.start &&
      frame.heat === state.heat &&
      frame.choices === state.choices &&
      frame.seed === state.seed &&
      gibberish(frame),
  },
] as const satisfies readonly [Mission<SamplingState, SamplingFrame>];

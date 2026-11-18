import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { forgot, type MemoryFrame, type MemoryState } from "./model";

export const missions = [
  {
    id: "push-it-out",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.pet === state.pet &&
      frame.name === state.name &&
      frame.window === state.window &&
      frame.chatter === state.chatter &&
      forgot(frame),
  },
] as const satisfies readonly [Mission<MemoryState, MemoryFrame>];

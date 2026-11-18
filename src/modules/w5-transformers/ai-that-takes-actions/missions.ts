import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { trapped, type AgentFrame, type AgentState } from "./model";

export const missions = [
  {
    id: "endless-loop",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.task === state.task &&
      frame.broken === state.broken &&
      frame.patience === state.patience &&
      trapped(frame),
  },
] as const satisfies readonly [Mission<AgentState, AgentFrame>];

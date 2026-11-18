import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { blurred, type BlockFrame, type BlockState } from "./model";

export const missions = [
  {
    id: "blur-without-shortcut",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.blocks === state.blocks &&
      frame.strength === state.strength &&
      frame.shortcut === state.shortcut &&
      !frame.shortcut &&
      blurred(frame),
  },
] as const satisfies readonly [Mission<BlockState, BlockFrame>];

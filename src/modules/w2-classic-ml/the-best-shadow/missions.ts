import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { POOR, shareOf, type ShadowState } from "./model";

export const missions = [
  {
    id: "squash-to-a-dot",
    ...missionWords.squash,
    replay: { before: 0, after: 0 },
    when: (state) => shareOf(state) <= POOR,
  },
] as const satisfies readonly [Mission<ShadowState>, ...Mission<ShadowState>[]];

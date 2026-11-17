import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { fooled, type SpamState } from "./model";

export const missions = [
  {
    id: "word-salad",
    ...missionWords.salad,
    replay: { before: 0, after: 0 },
    when: (state) => fooled(state),
  },
] as const satisfies readonly [Mission<SpamState>, ...Mission<SpamState>[]];

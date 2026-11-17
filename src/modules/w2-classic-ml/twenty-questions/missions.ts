import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { memorised, type QuestionsState } from "./model";

export const missions = [
  {
    id: "remember-every-nest",
    ...missionWords.memorise,
    replay: { before: 0, after: 0 },
    when: (state) => memorised(state),
  },
] as const satisfies readonly [Mission<QuestionsState>, ...Mission<QuestionsState>[]];

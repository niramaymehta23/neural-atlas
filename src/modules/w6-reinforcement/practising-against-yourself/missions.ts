import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { learnedACheapTrick, type PracticeFrame, type PracticeState } from "./model";

export const missions = [
  {
    id: "cheap-trick",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // A finished practice against a frozen Pop: Pip beats Pop nearly always, the newcomer beats Pip.
    when: learnedACheapTrick,
  },
] as const satisfies readonly [Mission<PracticeState, PracticeFrame>];

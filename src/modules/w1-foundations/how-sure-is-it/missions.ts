import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { sureAndWrong, type SureState } from "./model";

export const missions = [
  {
    id: "sure-and-wrong",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state) => sureAndWrong(state),
  },
] as const satisfies readonly [Mission<SureState>];

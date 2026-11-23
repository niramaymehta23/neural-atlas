import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, ONLY_FLATTERS, type ChatFrame, type ChatState } from "./model";

export const missions = [
  {
    id: "only-flatters",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // A finished training run whose answers praise the person in nearly every check question.
    when: (state, frame) => isFinished(state, frame) && frame.praise >= ONLY_FLATTERS,
  },
] as const satisfies readonly [Mission<ChatState, ChatFrame>];

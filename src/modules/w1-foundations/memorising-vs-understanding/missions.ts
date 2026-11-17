import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { ACED, FAILED, isFinished, type StudyFrame, type StudyState } from "./model";

export const missions = [
  {
    id: "ace-practice-fail-exam",
    ...missionWords,
    replay: { before: 30, after: 0 },
    // A finished practice that learned the past papers by heart and still failed the exam.
    when: (state, frame) => isFinished(state, frame) && frame.loss < ACED && frame.exam > FAILED,
  },
] as const satisfies readonly [Mission<StudyState, StudyFrame>];

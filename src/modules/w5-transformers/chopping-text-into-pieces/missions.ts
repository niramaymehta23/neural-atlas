import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import {
  costsMore,
  MISSION_LETTERS,
  MOST_LETTERS,
  type PiecesFrame,
  type PiecesState,
} from "./model";

export const missions = [
  {
    id: "costs-more",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // Real GPT-2 pieces (every piece known, any length) on at least a few letters of writing.
    when: (state, frame) =>
      frame !== undefined &&
      frame.text === state.text.slice(0, MOST_LETTERS) &&
      frame.full &&
      frame.letters >= MISSION_LETTERS &&
      costsMore(frame),
  },
] as const satisfies readonly [Mission<PiecesState, PiecesFrame>];

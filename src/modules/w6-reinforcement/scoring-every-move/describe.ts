import { words } from "./captions";
import { bowlFor, pacesOnTreats, plannedPath, type ScoringFrame, type ScoringState } from "./model";

/** The board in one sentence for screen readers: whether it can be solved, and how it is going. */
export function describeScoring(state: ScoringState, frame: ScoringFrame | undefined): string {
  const bowl = bowlFor(state.tiles);
  if (bowl !== "reachable") return words.bowl[bowl];
  if (!frame) return words.describe.idle;
  if (pacesOnTreats(frame)) return words.describe.pacing;
  return plannedPath(frame).length > 0 ? words.describe.found : words.describe.looking;
}

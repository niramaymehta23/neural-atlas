import { fromMoves } from "@/engine/rl/connect-four";
import { words } from "./captions";
import {
  isItsTurn,
  keyOf,
  placeOf,
  thinkingAt,
  YOU,
  type AheadFrame,
  type AheadState,
} from "./model";

/** The game in one sentence for screen readers: whose turn, how it ended, where it looked. */
export function describeAhead(state: AheadState, frame: AheadFrame | undefined): string {
  const board = fromMoves(state.moves);
  if (board.outcome === YOU) return words.status.youWon;
  if (board.outcome === "draw") return words.status.draw;
  if (board.outcome !== 0) return words.status.itWon;
  if (isItsTurn(board)) return words.describe.thinking;
  if (board.count === 0) return words.describe.start;
  const turn = words.describe.yourTurn(board.count);
  const ours = frame && frame.finished && frame.key === keyOf(thinkingAt(state.moves), state);
  return ours && frame.pick >= 0
    ? `${turn} ${words.describe.favourite(placeOf(frame.pick))}`
    : turn;
}

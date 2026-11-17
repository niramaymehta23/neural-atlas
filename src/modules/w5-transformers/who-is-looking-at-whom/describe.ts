import { favourites, hogShare } from "@/engine/pretrained/attention";
import { words } from "./captions";
import type { LookingFrame, LookingState } from "./model";

/** Threads lighter than this are not worth naming. */
const FAINT = 0.04;

/** The scene in one sentence for screen readers: the picked word's favourites, or the hog. */
export function describeLooking(state: LookingState, frame: LookingFrame | undefined): string {
  if (!frame) return "";
  const { threads } = frame;
  const word = threads.words[state.focus];
  if (word !== undefined) {
    const [first, second] = favourites(threads, state.focus, FAINT).map((at) => threads.words[at]);
    return words.describe.focus(word, first, second);
  }
  if (threads.words.length < 2) return "";
  return words.describe.everyone(threads.words[hogShare(threads).word] ?? "");
}

/**
 * How machines see: a picture-reading AI (MobileNet) shows what its torches found at three depths,
 * and names the picture. A faint smudge, made by nudging every colour a shade or two the way that
 * most changes the answer, can make it name something else.
 */
import { STAGES, type Answer, type Stage } from "@/engine/vision/seeing";
import type { SinglePhoto } from "@/features/inside/use-photo";
import type { TimelineFrame } from "@/platform/contract";

export const DEPTHS = STAGES.map(({ stage }) => stage);

export type SeeState = {
  photo: SinglePhoto;
  /** Which layer's maps are shown: edges (first), shapes (middle) or parts (deep). */
  depth: Stage;
  smudge: boolean;
  /** "How strong the smudge is": at most this many shades (of 255) per colour. */
  strength: number;
};

export const WEAKEST = 1;
export const STRONGEST = 8;
/** A smudge this faint or fainter is too faint to see: it changes each colour by a shade or two. */
export const FAINT = 2;

/** What the scene has worked out for the picture on screen; missions and guesses read it. */
export type SeeFrame = TimelineFrame & {
  /** The picture (a photo's name, or a camera snap) and smudge it belongs to. */
  key: string;
  smudge: boolean;
  strength: number;
  /** The AI's answer for the picture as shown (after the smudge, if there is one). */
  named: string;
  /** With a smudge: whether it changed the AI's answer. Without one: null. */
  fooled: boolean | null;
};

/** The picture and smudge a frame belongs to; `source` is the photo's name or a snap's. */
export const keyOf = (
  source: string,
  { smudge, strength }: Pick<SeeState, "smudge" | "strength">,
) => `${source}|${smudge ? strength : 0}`;

/** Did the smudge change the AI's best answer? */
export const changed = (before: readonly Answer[], after: readonly Answer[]) =>
  before[0]?.thing !== after[0]?.thing;

/**
 * The smudge itself made visible: mid-grey where nothing changed, lighter or darker where a colour
 * was nudged up or down, stretched so the strongest nudge fills the range.
 */
export function smudgeView(before: Uint8ClampedArray, after: Uint8ClampedArray): Uint8ClampedArray {
  let most = 1;
  for (let at = 0; at < before.length; at += 1) {
    if (at % 4 !== 3) most = Math.max(most, Math.abs((after[at] ?? 0) - (before[at] ?? 0)));
  }
  const view = new Uint8ClampedArray(before.length);
  for (let at = 0; at < before.length; at += 1) {
    view[at] = at % 4 === 3 ? 255 : 128 + (((after[at] ?? 0) - (before[at] ?? 0)) * 127) / most;
  }
  return view;
}

/** The frame for a picture the AI has read, with or without a smudge. */
export function frameFor(
  source: string,
  state: SeeState,
  named: string,
  fooled: boolean | null,
  epoch: number,
): SeeFrame {
  return {
    epoch,
    loss: 0,
    key: keyOf(source, state),
    smudge: state.smudge,
    strength: state.strength,
    named,
    fooled: state.smudge ? fooled : null,
  };
}

/** The frame belongs to the smudge now set (it may be from a camera snap rather than a photo). */
export const matches = (state: SeeState, frame: SeeFrame | undefined): frame is SeeFrame =>
  frame !== undefined && frame.smudge === state.smudge && frame.strength === state.strength;

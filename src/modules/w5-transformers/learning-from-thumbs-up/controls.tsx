"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import type { ThumbsFrame, ThumbsState } from "./model";

/** No dials here: the picks are made in the scene. The dock says how many have been made. */
export function ThumbsControls({ state }: ModuleViewProps<ThumbsState, ThumbsFrame>) {
  return <p className="text-sm text-ink-soft">{words.made(state.picks.length)}</p>;
}

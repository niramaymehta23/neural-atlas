"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { keyOf, type ChatFrame, type ChatState } from "./model";

/** Each dial's words, in bands that match what the chatbot really does there. */
export const dialWords = {
  taste: (value: number) =>
    value < 0.05
      ? words.taste.none
      : value < 0.4
        ? words.taste.little
        : value < 0.75
          ? words.taste.fair
          : words.taste.lots,
  train: (value: number) =>
    value < 0.01
      ? words.train.none
      : value < 0.35
        ? words.train.short
        : value < 0.8
          ? words.train.medium
          : words.train.long,
  leash: (value: number) =>
    value < 0.05
      ? words.leash.off
      : value < 0.35
        ? words.leash.loose
        : value < 0.7
          ? words.leash.medium
          : words.leash.tight,
};

const DIALS = ["taste", "train", "leash"] as const;

export function ChatControls({ state, update, timeline }: ModuleViewProps<ChatState, ChatFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      {DIALS.map((dial) => (
        <Dial
          key={dial}
          label={words[dial].label}
          value={state[dial]}
          onChange={(value) => update({ [dial]: value })}
          describe={dialWords[dial]}
        />
      ))}
      <button
        type="button"
        disabled={working}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.start : working ? words.working : words.again}
      </button>
    </>
  );
}

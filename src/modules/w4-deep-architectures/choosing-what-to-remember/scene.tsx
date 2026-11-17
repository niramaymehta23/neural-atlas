"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import { MemoryStrip } from "@/features/memory/MemoryStrip";
import {
  memoryOf,
  readStory,
  rightWith,
  storyOf,
  surenessOf,
  untrained,
} from "@/features/memory/run";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { gatesOf, gatesRun, keyOf, type GatesFrame, type GatesState } from "./model";

type Props = ModuleViewProps<GatesState, GatesFrame>;

/** What the reader answers for the sentence on screen, in words. */
export function answerSentence(rainy: number) {
  const thing = rainy > 0.5 ? words.things.rainy : words.things.sunny;
  return words.says(thing, words.sureness[surenessOf(rainy)]);
}

/** The sentence with its memory beads and gates, the answer, and how it does on new sentences. */
export function GatesScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: gatesRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const { cell, length, start, keep, letIn, readOut } = state;
  const reading = useMemo(
    () =>
      readStory(cell, shown?.params ?? untrained(cell), length, start === "rainy", {
        keep,
        letIn,
        readOut,
      }),
    [shown, cell, length, start, keep, letIn, readOut],
  );
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  const right = useMemo(
    () => (ours ? rightWith(cell, ours.params, length, { keep, letIn, readOut }) : null),
    [ours, cell, length, keep, letIn, readOut],
  );
  if (failure) throw failure;

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="choosing-what-to-remember"
      data-epoch={ours?.epoch ?? 0}
      data-gates={Object.values(gatesOf(state)).join(" ")}
    >
      <MemoryStrip
        words={words.strip}
        story={storyOf(length)}
        rainy={start === "rainy"}
        reading={reading}
        gated={cell === "gated"}
      />
      <p className="text-xs text-ink-soft">{words.bead}</p>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-16 flex-col gap-1 text-sm">
        {right !== null ? (
          <>
            <p data-answer>{answerSentence(reading.rainy)}</p>
            <p data-memory={memoryOf(right)}>{words.memory[memoryOf(right)]}</p>
          </>
        ) : (
          <p data-answer>{state.runs === 0 ? words.waiting : words.working}</p>
        )}
      </div>
    </div>
  );
}

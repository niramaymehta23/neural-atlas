"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import { MemoryStrip } from "@/features/memory/MemoryStrip";
import { memoryOf, readStory, storyOf, surenessOf, untrained } from "@/features/memory/run";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { keyOf, readingRun, type ReadingFrame, type ReadingState } from "./model";

type Props = ModuleViewProps<ReadingState, ReadingFrame>;

/** What the reader answers for the sentence on screen, in words. */
export function answerSentence(rainy: number) {
  const thing = rainy > 0.5 ? words.things.rainy : words.things.sunny;
  return words.says(thing, words.sureness[surenessOf(rainy)]);
}

/** The sentence with its memory beads, what the reader answers, and how it does on new sentences. */
export function ReadingScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: readingRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const { length, start } = state;
  const reading = useMemo(
    () => readStory("plain", shown?.params ?? untrained("plain"), length, start === "rainy"),
    [shown, length, start],
  );
  if (failure) throw failure;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="reading-one-word-at-a-time"
      data-epoch={ours?.epoch ?? 0}
    >
      <MemoryStrip
        words={words.strip}
        story={storyOf(state.length)}
        rainy={state.start === "rainy"}
        reading={reading}
        gated={false}
      />
      <p className="text-xs text-ink-soft">{words.bead}</p>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-16 flex-col gap-1 text-sm">
        {ours ? (
          <>
            <p data-answer>{answerSentence(reading.rainy)}</p>
            <p data-memory={memoryOf(ours.right)}>{words.memory[memoryOf(ours.right)]}</p>
          </>
        ) : (
          <p data-answer>{state.runs === 0 ? words.waiting : words.working}</p>
        )}
      </div>
    </div>
  );
}

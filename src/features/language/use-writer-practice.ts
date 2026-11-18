"use client";

import { useEffect, useRef, useState } from "react";
import type { WriterMoment, WriterRunConfig } from "@/engine/language/baby-gpt";
import { WriterClient } from "@/engine/language/writer-client";
import type { ModuleState, ModuleViewProps, TimelineFrame } from "@/platform/contract";

/** What a baby GPT lesson keeps in its state for the practice run. */
export type PracticeState = ModuleState & {
  /** Steps practised so far; a link replays the run up to here. */
  steps: number;
  /** Practising now (a link never opens running). */
  running: boolean;
};

type Options<S extends PracticeState, F extends TimelineFrame> = ModuleViewProps<S, F> & {
  /** The run's settings; null until the files it needs have arrived. */
  config: WriterRunConfig | null;
  /** Everything the run depends on, as one string: a change starts a new run. */
  runKey: string;
  /** Steps a run stops at. */
  most: number;
  toFrame: (moment: WriterMoment, runKey: string) => F;
};

/**
 * Practises baby GPT in its worker and records every moment on the timeline. A link replays the run
 * up to its saved step (the same seed and batches, so the same moments) and never starts it running;
 * "practise" carries on to `most`. Changing what the run depends on starts a new run, so the old one
 * stays as the ghost. A worker failure is returned, for the scene to throw to its error boundary.
 */
export function useWriterPractice<S extends PracticeState, F extends TimelineFrame>({
  state,
  update,
  timeline,
  side,
  config,
  runKey,
  most,
  toFrame,
}: Options<S, F>): Error | null {
  const main = side === "main";
  const latest = useRef({ state, config, toFrame });
  useEffect(() => {
    latest.current = { state, config, toFrame };
  });
  const [failure, setFailure] = useState<Error | null>(null);
  const [client, setClient] = useState<WriterClient | null>(null);
  const ready = config !== null;

  useEffect(() => {
    const { config: now, state: saved } = latest.current;
    if (!now) return;
    const created = new WriterClient({
      onMoment: (moment) => {
        timeline.record(latest.current.toFrame(moment, runKey));
        if (main && moment.step > latest.current.state.steps) {
          update((current) => ({ ...current, steps: moment.step }), { touch: false });
        }
      },
      onStopped: (step) => {
        if (main && latest.current.state.running && step >= most) {
          update((current) => ({ ...current, running: false }), { touch: false });
        }
      },
      onError: (message) => setFailure(new Error(message)),
    });
    created.start(now);
    created.go(saved.running ? most : saved.steps);
    setClient(created);
    return () => {
      created.dispose();
      timeline.newRun();
      setClient(null);
    };
  }, [runKey, ready, timeline, main, update, most]);

  const wasRunning = useRef(state.running);
  useEffect(() => {
    if (!client) return;
    if (state.running) {
      timeline.goLive();
      client.go(most);
    } else if (wasRunning.current) client.pause();
    wasRunning.current = state.running;
  }, [client, state.running, timeline, most]);

  return failure;
}

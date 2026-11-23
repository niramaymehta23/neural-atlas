"use client";

import { useEffect, useRef, useState } from "react";
import { AgentClient } from "@/engine/rl/agent-client";
import type { AgentMoment, AgentRunConfig } from "@/engine/rl/agent-protocol";
import type { ModuleState, ModuleViewProps, TimelineFrame } from "@/platform/contract";

/** What a World 6 agent lesson keeps in its state for the practice run. */
export type AgentPracticeState = ModuleState & {
  /** Steps (games or batches) practised so far; a link replays the run up to here. */
  steps: number;
  /** Practising now (a link never opens running). */
  running: boolean;
};

type Options<S extends AgentPracticeState, F extends TimelineFrame> = ModuleViewProps<S, F> & {
  /** The run's settings. */
  config: AgentRunConfig;
  /** Everything the run depends on, as one string: a change starts a new run. */
  runKey: string;
  /** Steps a run stops at. */
  most: number;
  /** Steps a second while practising, so the learner can watch it learn. */
  perSecond: number;
  /** Turns a moment of this run's agent into a timeline frame. */
  toFrame: (moment: AgentMoment, runKey: string) => F;
};

/**
 * Practises an agent in its worker and records every moment on the timeline. A link replays the
 * run up to its saved step as fast as it can (the same seed, so the same moments) and never
 * starts it running; "practise" carries on to `most` at `perSecond`. Changing what the run
 * depends on starts a new run from the beginning, so the old one stays as the ghost. A worker
 * failure is returned, for the scene to throw to its error boundary.
 */
export function useAgentPractice<S extends AgentPracticeState, F extends TimelineFrame>({
  state,
  update,
  timeline,
  side,
  config,
  runKey,
  most,
  perSecond,
  toFrame,
}: Options<S, F>): Error | null {
  const main = side === "main";
  const latest = useRef({ state, config, toFrame, perSecond });
  useEffect(() => {
    latest.current = { state, config, toFrame, perSecond };
  });
  const [failure, setFailure] = useState<Error | null>(null);
  const [client, setClient] = useState<AgentClient | null>(null);

  useEffect(() => {
    const { config: now, state: saved, perSecond: pace } = latest.current;
    const created = new AgentClient({
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
    if (saved.running) created.go(most, pace);
    else created.go(Math.min(saved.steps, most));
    setClient(created);
    return () => {
      created.dispose();
      timeline.newRun();
      setClient(null);
    };
  }, [runKey, timeline, main, update, most]);

  const wasRunning = useRef(state.running);
  useEffect(() => {
    if (!client) return;
    if (state.running) {
      timeline.goLive();
      client.go(most, perSecond);
    } else if (wasRunning.current) client.pause();
    wasRunning.current = state.running;
  }, [client, state.running, timeline, most, perSecond]);

  return failure;
}

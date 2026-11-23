"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LabClient } from "@/engine/lab/lab-client";
import type { LabConfig, LabMoment } from "@/engine/lab/lab-run";

/** How right and how far off each learner was, step by step (index 0 is the start). */
export type LabHistory = {
  right: readonly (readonly number[])[];
  off: readonly (readonly number[])[];
};

type Options = {
  /** What to practise, or null for nothing to practise on. */
  config: LabConfig | null;
  /** Everything the run depends on, as one string: a change starts a new run. */
  runKey: string;
  /** Steps taken so far; a link replays the run up to here. */
  steps: number;
  running: boolean;
  /** Steps a run stops at. */
  most: number;
  /** Steps a second while practising, so it can be watched. */
  perSecond: number;
  /** The run moved on by itself. */
  onStep: (step: number) => void;
  /** The run reached `most`. */
  onFinished: () => void;
  /** Stops the run early, such as when a race is won. */
  endsAt?: (moment: LabMoment) => boolean;
};

const START: LabHistory = { right: [], off: [] };

/** Each learner's own measures: one learner, or a race's two. */
const measures = (moment: LabMoment) =>
  (moment.kind === "race" ? moment.teams : [moment]).map(({ right, off }) => ({ right, off }));

const freshRun = (key: string) => ({
  key,
  right: [] as number[][],
  off: [] as number[][],
  waiting: null as LabMoment | null,
  ended: false,
});

/**
 * Practises in the lab's worker and hands back the newest moment. A saved run is replayed to its
 * step as fast as it goes (the same seed, so the same run); pressing start carries on at a pace
 * that can be watched. Anything the run depends on starts a fresh one. Moments are shown once a
 * frame at most, however fast they come.
 */
export function useLab({
  config,
  runKey,
  steps,
  running,
  most,
  perSecond,
  onStep,
  onFinished,
  endsAt,
}: Options) {
  const latest = useRef({ config, steps, running, most, perSecond, onStep, onFinished, endsAt });
  useEffect(() => {
    latest.current = { config, steps, running, most, perSecond, onStep, onFinished, endsAt };
  });
  const [shown, setShown] = useState<{
    key: string;
    moment: LabMoment;
    history: LabHistory;
  } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [start, setStart] = useState(0);
  const client = useRef<LabClient | null>(null);
  /** The worker failed, so it cannot be relied on to run anything else. */
  const broken = useRef(false);
  /** The run whose moments are arriving, and what it has shown so far. */
  const run = useRef(freshRun(""));

  useEffect(() => {
    let frame = 0;
    const show = () => {
      frame = 0;
      const { key, waiting: moment, right, off } = run.current;
      if (!moment) return;
      run.current.waiting = null;
      setShown({
        key,
        moment,
        history: { right: right.map((line) => [...line]), off: off.map((line) => [...line]) },
      });
      if (moment.step > latest.current.steps) latest.current.onStep(moment.step);
      if (run.current.ended || moment.step >= latest.current.most) latest.current.onFinished();
    };
    const created = new LabClient({
      onMoment: (moment) => {
        const now = run.current;
        // A run that was ended early ignores the few steps already on their way.
        if (now.ended) return;
        measures(moment).forEach(({ right, off }, learner) => {
          (now.right[learner] ??= [])[moment.step] = right;
          (now.off[learner] ??= [])[moment.step] = off;
        });
        now.waiting = moment;
        if (latest.current.endsAt?.(moment)) {
          now.ended = true;
          created.pause();
        }
        if (!frame) frame = requestAnimationFrame(show);
      },
      onError: (message) => {
        broken.current = true;
        setFailure(message);
      },
    });
    broken.current = false;
    client.current = created;
    return () => {
      cancelAnimationFrame(frame);
      created.dispose();
      client.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    const {
      config: now,
      steps: saved,
      running: going,
      most: end,
      perSecond: pace,
    } = latest.current;
    run.current = freshRun(runKey);
    if (!now || !client.current) return;
    setFailure(null);
    if (broken.current) {
      // A new worker for the new run; making it brings this effect round again.
      setAttempt((count) => count + 1);
      return;
    }
    client.current.start(now);
    if (going) client.current.go(end, pace);
    else client.current.go(Math.min(saved, end));
  }, [runKey, attempt, start]);

  const wasRunning = useRef(running);
  useEffect(() => {
    if (wasRunning.current === running) return;
    wasRunning.current = running;
    if (running) client.current?.go(most, perSecond);
    else client.current?.pause();
  }, [running, most, perSecond]);

  /** After a failure: a new worker, and the run from its saved step. */
  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((count) => count + 1);
  }, []);

  const current = config !== null && shown?.key === runKey;
  /** The same run again, from its beginning (set the saved step back to 0 with it). */
  const restart = useCallback(() => setStart((count) => count + 1), []);

  return {
    /** The run's newest moment, or null while a new run has none yet. */
    moment: current ? shown.moment : null,
    history: current ? shown.history : START,
    /** The last moment shown, even from the run before, so a picture need not blink out. */
    lastMoment: shown?.moment ?? null,
    failure,
    retry,
    restart,
  };
}

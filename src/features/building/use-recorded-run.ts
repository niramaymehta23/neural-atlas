"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/design/motion";
import type { Timeline } from "@/engine/timeline/timeline";
import type { ModuleState, ModuleViewProps, TimelineFrame } from "@/platform/contract";

/** Work done between breaths, so the page keeps drawing at 60 fps while a run is worked out. */
export const SLICE_MS = 6;
/** Dial changes closer together than this are one turn of a dial: one new run after it (DH-05). */
export const SETTLE_MS = 400;

type RecordedRunOptions<S extends ModuleState, F extends TimelineFrame> = ModuleViewProps<S, F> & {
  /** How many runs have been asked for; 0 records nothing. A link replays the last one. */
  runs: number;
  /**
   * Every frame of the run `state` describes, in order. Pure: the same state, the same frames.
   * A `null` is a breath: work done with nothing to record yet (a plan still being worked out),
   * so a long piece of work can be spread over several slices.
   */
  work: (state: S) => Iterable<F | null>;
  /**
   * The settings a run depends on, as one string. Changing them after a run asks for one new
   * run once they rest, so the run on screen always matches the dials (the old one stays as
   * the ghost). Omit for lessons where only a button starts a run.
   */
  settings?: string;
  /** Called with the number of runs to ask for when the settings have rested (main side only). */
  rerun?: () => void;
};

export type RecordedRun = {
  /** True while a run is being worked out (the button says so; nothing new is shown yet). */
  working: boolean;
  /** A run that threw: the scene throws it from render, so the lesson's boundary shows it. */
  failure: Error | null;
};

/**
 * Works out a whole run in short slices, records it on the timeline at once as a new run (the
 * last one stays as the ghost), then plays it from the start; with reduced motion it simply
 * shows the end. A hidden or throttled tab still finishes it (DH-01). The run is rebuilt from
 * state, so a shared link replays it exactly, and the shell seeks to the saved moment.
 */
export function useRecordedRun<S extends ModuleState, F extends TimelineFrame>({
  state,
  timeline,
  side,
  runs,
  work,
  settings,
  rerun,
}: RecordedRunOptions<S, F>): RecordedRun {
  const reduced = useReducedMotion();
  const latest = useRef({ state, reduced, work, settings });
  const ranWith = useRef<string | undefined>(undefined);
  /** The run counter the timeline holds a finished run for. */
  const [finished, setFinished] = useState(0);
  const [failure, setFailure] = useState<Error | null>(null);
  useEffect(() => {
    latest.current = { state, reduced, work, settings };
  });

  useEffect(() => {
    if (runs === 0) return;
    ranWith.current = latest.current.settings;
    let cancelled = false;
    let frames: Iterator<F | null> | null = null;
    const recorded: F[] = [];
    const fail = (error: unknown) => {
      setFailure(error instanceof Error ? error : new Error(String(error)));
      setFinished(runs);
    };
    const slice = () => {
      if (cancelled) return;
      const started = performance.now();
      try {
        frames ??= latest.current.work(latest.current.state)[Symbol.iterator]();
        for (;;) {
          const next = frames.next();
          if (next.done) break;
          if (next.value !== null) recorded.push(next.value);
          if (performance.now() - started > SLICE_MS) {
            timer = setTimeout(slice, 0);
            return;
          }
        }
      } catch (error) {
        return fail(error);
      }
      timeline.newRun();
      for (const frame of recorded) timeline.record(frame);
      setFinished(runs);
      // The compare half follows the main timeline's moment; only the main one plays.
      if (side === "main" && !latest.current.reduced && recorded.length > 1) {
        timeline.seek(0);
        timeline.play();
      }
    };
    let timer = setTimeout(slice, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // A run is asked for by `runs`; the settings it uses are read from the latest state.
  }, [runs, side, timeline]);

  useEffect(() => {
    if (side !== "main" || runs === 0 || !rerun || settings === undefined) return;
    if (ranWith.current === undefined || ranWith.current === settings) return;
    const wait = setTimeout(rerun, SETTLE_MS);
    return () => clearTimeout(wait);
  }, [settings, runs, side, rerun]);

  return { working: runs > 0 && finished !== runs && !failure, failure };
}

/** The newest recorded frame, for buttons that wait for a run to be on the timeline. */
export const newestOf = <F extends TimelineFrame>(timeline: Timeline<F>) =>
  timeline.at(timeline.getState().length - 1);

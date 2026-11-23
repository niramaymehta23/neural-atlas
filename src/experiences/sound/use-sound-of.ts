"use client";

import { useEffect, useRef } from "react";
import { useStore } from "zustand";
import { award } from "../achievements/achievements";
import { playChime, playNote, soundStore, tenths, turnSoundOff } from "./sound";

/**
 * Plays a learner's progress while sound is on: one note per new moment, a chime per tenth
 * gained. `step` says when a moment is new; a smaller one is a run starting over.
 */
export function useSoundOf(
  moment: { step: number; off: number; right: number } | null,
  playing: boolean,
) {
  const on = useStore(soundStore, (state) => state.on);
  const heard = useRef({ step: -1, tenths: 0 });
  const step = moment?.step ?? -1;
  const off = moment?.off ?? 1;
  const right = moment?.right ?? 0;
  useEffect(() => {
    const before = heard.current;
    const now = tenths(right);
    const started = step > before.step ? before.tenths : now;
    heard.current = { step, tenths: step > before.step ? Math.max(started, now) : now };
    if (!on || !playing || step < 0 || step === before.step) return;
    playNote(off);
    void award("sound");
    if (step > before.step && now > started) playChime();
  }, [on, playing, step, off, right]);
  // Leaving the page is leaving the sound: it always starts off again.
  useEffect(() => turnSoundOff, []);
}

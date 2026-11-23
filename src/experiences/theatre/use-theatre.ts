"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/design/motion";
import { useTheme } from "@/design/use-theme";
import { makeShapes, readPalette, type Painter, type Show } from "./painter";

/** Calm and kind to batteries: thirty pictures a second. */
const FRAME_SECONDS = 1 / 30;
/** Under reduced motion a still picture changes this often, and nothing slides. */
const STILL_SECONDS = 2.5;
/** A frame never moves a show on by more than this, however long the page slept. */
const MOST_SECONDS = 0.25;
const MOST_PIXELS = 2;

type Options = {
  show: Show | null;
  playing: boolean;
  /** Seconds of watching that went by, about once a second. */
  onWatched: (seconds: number) => void;
  /** The show threw: it is not played on, and the page says so. */
  onBroken: () => void;
};

/**
 * Plays a show on a canvas that fills its box. The loop stops while the page is hidden or the
 * show is paused; a pause, a new size or a new page colour still redraws the picture.
 */
export function useTheatre({ show, playing, onWatched, onBroken }: Options) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const theme = useTheme();
  const told = useRef({ onWatched, onBroken });
  useEffect(() => {
    told.current = { onWatched, onBroken };
  });

  useEffect(() => {
    const element = ref.current;
    const context = element?.getContext("2d");
    if (!element || !context || !show) return;
    const painter: Painter = {
      context,
      width: 0,
      height: 0,
      palette: readPalette(),
      shapes: makeShapes(),
      serif: getComputedStyle(element.closest("main")?.querySelector("h1") ?? element).fontFamily,
      sans: getComputedStyle(element).fontFamily,
      still: reduced,
    };
    /** Moves on (if asked) and draws; false when the show threw. */
    const draw = (seconds = 0): boolean => {
      try {
        if (seconds > 0) show.advance(seconds);
        if (painter.width === 0 || painter.height === 0) return true;
        context.fillStyle = painter.palette.paper;
        context.fillRect(0, 0, painter.width, painter.height);
        show.draw(painter);
        return true;
      } catch {
        told.current.onBroken();
        return false;
      }
    };
    const fit = () => {
      const { width, height } = element.getBoundingClientRect();
      const scale = Math.min(MOST_PIXELS, window.devicePixelRatio || 1);
      element.width = Math.max(1, Math.round(width * scale));
      element.height = Math.max(1, Math.round(height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
      painter.width = width;
      painter.height = height;
      draw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);

    let frame = 0;
    let last: number | null = null;
    let owed = 0;
    let seen = 0;
    const every = reduced ? STILL_SECONDS : FRAME_SECONDS;
    const loop = (now: number) => {
      const passed = last === null ? 0 : Math.max(0, (now - last) / 1000);
      last = now;
      owed += Math.min(passed, MOST_SECONDS);
      seen += Math.min(passed, MOST_SECONDS);
      if (seen >= 1) {
        told.current.onWatched(seen);
        seen = 0;
      }
      if (owed >= every) {
        if (!draw(owed)) return;
        owed = 0;
      }
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (frame || !playing || document.visibilityState === "hidden") return;
      last = null;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const follow = () => (document.visibilityState === "hidden" ? stop() : start());
    document.addEventListener("visibilitychange", follow);
    start();
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", follow);
    };
    // The theme is read when the palette is: a new one draws in the new colours.
  }, [show, playing, reduced, theme]);

  return ref;
}

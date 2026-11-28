import { drawingLoop, DRIFT_RATE, REST_MS } from "@/design/drawing-loop";

/** Drawings a second while the map leans after the pointer, so the lean looks smooth. */
export const LEAN_RATE = 30;

/** How far the map's drift has got. It is counted only while the map floats, so it never jumps. */
export type Drifting = {
  seconds: () => number;
  advance: (seconds: number) => void;
  /** Whether the map is on its way after the pointer. */
  lean: (leaning: boolean) => void;
  leaning: () => boolean;
};

export function createDrifting(): Drifting {
  let seconds = 0;
  let leaning = false;
  return {
    seconds: () => seconds,
    advance: (passed) => {
      seconds += passed;
    },
    lean: (now) => {
      leaning = now;
    },
    leaning: () => leaning,
  };
}

/**
 * Asks for a new drawing again and again while the learner is around, so the map floats: rarely
 * while it only drifts (nothing moves a third of a pixel between drawings), more often while it
 * leans. It holds still in a hidden tab, out of view, or after 20 s without a sign of the learner.
 * Returns a function that stops it for good.
 */
export function startFloating(
  drifting: Drifting,
  invalidate: () => void,
  element: Element | null = null,
): () => void {
  return drawingLoop(
    (seconds) => {
      drifting.advance(seconds);
      invalidate();
    },
    { rate: () => (drifting.leaning() ? LEAN_RATE : DRIFT_RATE), element, restAfter: REST_MS },
  );
}

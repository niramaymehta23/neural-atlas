/** About 30 frames a second is plenty for a slow bob. */
export const FLOAT_FRAME_MS = 33;
/** After this long with no pointer or key, the map holds still and stops drawing. */
export const FLOAT_IDLE_MS = 20_000;

const WAKE_EVENTS = ["pointermove", "pointerdown", "keydown", "focusin"] as const;

/**
 * Asks for a new frame about 30 times a second while the learner is around, so the map floats.
 * It stops asking while the tab is hidden or after 20 s without a pointer or key, and picks up
 * again on the next one. Returns a function that stops it for good.
 */
export function startFloating(invalidate: () => void): () => void {
  let lastActive = Date.now();
  const wake = () => {
    lastActive = Date.now();
  };
  for (const name of WAKE_EVENTS) window.addEventListener(name, wake, { passive: true });
  const timer = setInterval(() => {
    if (document.hidden || Date.now() - lastActive > FLOAT_IDLE_MS) return;
    invalidate();
  }, FLOAT_FRAME_MS);
  return () => {
    clearInterval(timer);
    for (const name of WAKE_EVENTS) window.removeEventListener(name, wake);
  };
}

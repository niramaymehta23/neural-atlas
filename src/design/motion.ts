import { useSyncExternalStore } from "react";
import type { Transition } from "motion/react";

/**
 * Every animation's timing. Springs settle rather than snap, within 200–400 ms.
 * Components pick a spring through `useSpring`, which honours reduced motion.
 */
export const springs = {
  /** Default: ideas and panels arriving, settling with a whisper of overshoot. */
  settle: { type: "spring", visualDuration: 0.35, bounce: 0.12 },
  /** Small controls following a finger or key press. */
  gentle: { type: "spring", visualDuration: 0.22, bounce: 0 },
  /** Content fading in or out with no movement. */
  fade: { type: "tween", duration: 0.3, ease: "easeOut" },
} as const satisfies Record<string, Transition>;

export type SpringName = keyof typeof springs;

const instant: Transition = { duration: 0 };
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True when the person asked their system for less motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}

/** The named spring, or an instant change under reduced motion. */
export function useSpring(name: SpringName = "settle"): Transition {
  return useReducedMotion() ? instant : springs[name];
}

"use client";

import { motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { useReducedMotion, useSpring } from "@/design/motion";

/** False until the first page has mounted: the first paint never fades (it may have no JS). */
let navigated = false;
const FOCUS_WAIT_MS = 4000;

/**
 * Moving between pages cross-fades instead of cutting (instant under reduced motion), and
 * keyboard focus lands on the new page's heading, which may arrive once the page has loaded.
 */
function focusHeadingWhenShown(): () => void {
  const tryFocus = () => {
    const heading = document.querySelector("main h1");
    if (!(heading instanceof HTMLElement)) return false;
    if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    return true;
  };
  if (tryFocus()) return () => undefined;
  const observer = new MutationObserver(() => {
    if (tryFocus()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const timer = setTimeout(() => observer.disconnect(), FOCUS_WAIT_MS);
  return () => {
    observer.disconnect();
    clearTimeout(timer);
  };
}

export default function Template({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const transition = useSpring("fade");
  const fadeIn = navigated && !reduced;

  useEffect(() => {
    if (!navigated) {
      navigated = true;
      return;
    }
    return focusHeadingWhenShown();
  }, []);

  return (
    <motion.div
      data-route-fade
      initial={fadeIn ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

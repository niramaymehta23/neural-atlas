"use client";

import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion, useSpring } from "@/design/motion";

type StoryCaptionProps = {
  /** Becomes true after the learner's first interaction; the caption then settles in. */
  shown: boolean;
  /** One line explaining what they just felt. */
  children: string;
};

/** The one-line story caption that appears once the learner has touched the scene. */
export function StoryCaption({ shown, children }: StoryCaptionProps) {
  const reduced = useReducedMotion();
  const transition = useSpring("settle");
  return (
    <div aria-live="polite" className="min-h-[1.75em]">
      <AnimatePresence>
        {shown && (
          <motion.p
            key={children}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={transition}
            className="font-serif text-xl leading-snug text-ink"
          >
            {children}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

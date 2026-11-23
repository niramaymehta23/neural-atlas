"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { useStore } from "zustand";
import { useReducedMotion, useSpring } from "@/design/motion";
import { awardStore } from "./achievements";
import { achievementCaptions as words } from "./captions";
import { AchievementMark } from "./AchievementMark";

/** Long enough to read twice; the star itself stays on the map. */
const SHOWN_MS = 8000;

/** A small note in the corner when an achievement is earned. It never takes the focus. */
export function AwardNote() {
  const latest = useStore(awardStore, (state) => state.latest);
  const reduced = useReducedMotion();
  const transition = useSpring("settle");
  useEffect(() => {
    if (!latest) return;
    const gone = setTimeout(() => awardStore.setState({ latest: null }), SHOWN_MS);
    return () => clearTimeout(gone);
  }, [latest]);
  return (
    <div
      role="status"
      data-award={latest?.id}
      className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center"
    >
      <AnimatePresence>
        {latest && (
          <motion.div
            key={latest.id}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={transition}
            className="pointer-events-auto flex items-center gap-3 rounded-pill border border-hairline bg-card px-5 py-3 text-sm text-ink"
          >
            <AchievementMark earned className="size-5 shrink-0" />
            <span>{words.earned(latest.title)}</span>
            <Link href="/" className="text-accent-ink underline-offset-4 hover:underline">
              {words.onMap}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

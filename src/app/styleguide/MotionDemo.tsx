"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { springs, useReducedMotion, type SpringName } from "@/design/motion";

const NAMES = Object.keys(springs) as SpringName[];

export function MotionDemo() {
  const [moved, setMoved] = useState(false);
  const reduced = useReducedMotion();
  return (
    <div className="flex w-full flex-col gap-4">
      <button
        type="button"
        onClick={() => setMoved((was) => !was)}
        className="self-start rounded-pill border border-hairline bg-card px-4 py-2 text-sm text-accent-ink"
      >
        {moved ? "Send them back" : "Send them across"}
      </button>
      {reduced && (
        <p className="text-sm text-ink-soft">Reduced motion is on, so changes are instant.</p>
      )}
      <ul className="flex w-full flex-col gap-3">
        {NAMES.map((name) => (
          <li key={name} data-token={name} className="flex items-center gap-4">
            <code className="w-16 text-xs text-ink-soft">{name}</code>
            <span className="relative h-6 flex-1 rounded-pill bg-inset">
              <motion.span
                className="absolute top-0.5 left-0.5 size-5 rounded-pill bg-flow"
                animate={{ left: moved ? "calc(100% - 22px)" : "2px" }}
                transition={reduced ? { duration: 0 } : springs[name]}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

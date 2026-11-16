"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Collapsible } from "radix-ui";
import { useReducedMotion, useSpring } from "@/design/motion";
import { uiCaptions } from "./captions";

type UnderTheHoodDrawerProps = {
  children: ReactNode;
  label?: string;
};

/** The "peek under the hood" drawer for the curious. Always starts closed. */
export function UnderTheHoodDrawer({
  children,
  label = uiCaptions.drawer,
}: UnderTheHoodDrawerProps) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const transition = useSpring("settle");
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className="rounded-card border border-hairline"
    >
      <Collapsible.Trigger className="flex w-full items-center justify-between gap-4 rounded-card px-5 py-3 text-left text-sm text-ink">
        {label}
        <motion.svg
          viewBox="0 0 12 12"
          aria-hidden
          className="size-3 stroke-ink-soft"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={transition}
        >
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" strokeWidth="1.5" strokeLinecap="round" />
        </motion.svg>
      </Collapsible.Trigger>
      <AnimatePresence initial={false}>
        {open && (
          <Collapsible.Content forceMount asChild>
            <motion.div
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduced ? undefined : { height: 0, opacity: 0 }}
              transition={transition}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 text-sm text-ink-soft">{children}</div>
            </motion.div>
          </Collapsible.Content>
        )}
      </AnimatePresence>
    </Collapsible.Root>
  );
}

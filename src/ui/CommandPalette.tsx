"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Command } from "cmdk";
import { motion } from "motion/react";
import { Dialog } from "radix-ui";
import { useReducedMotion, useSpring } from "@/design/motion";

export type PaletteItem = { id: string; label: string; hint?: string };

type CommandPaletteProps = {
  items: readonly PaletteItem[];
  onSelect: (id: string) => void;
};

const TITLE = "Find an idea";
const ignore = () => () => undefined;
const isApple = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Jump to any idea by name. Opens with Cmd+K or Ctrl+K, or the button. */
export function CommandPalette({ items, onSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const transition = useSpring("gentle");
  const shortcut = useSyncExternalStore(
    ignore,
    () => (isApple() ? "⌘ K" : "Ctrl K"),
    () => "Ctrl K",
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex items-center gap-3 rounded-pill border border-hairline bg-card px-4 py-2 text-sm text-ink-soft">
        {TITLE}
        <kbd className="rounded-inner bg-inset px-1.5 py-0.5 font-sans text-xs">{shortcut}</kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-scrim" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-[18vh] mx-auto w-[min(92vw,34rem)]"
        >
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="overflow-hidden rounded-card border border-hairline bg-card text-ink"
          >
            <Dialog.Title className="sr-only">{TITLE}</Dialog.Title>
            <Command label={TITLE}>
              <Command.Input
                placeholder="Type an idea, like “sorting fruit”"
                className="w-full border-b border-hairline bg-transparent px-5 py-4 text-base outline-none placeholder:text-ink-soft"
              />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-ink-soft">
                  Nothing by that name yet.
                </Command.Empty>
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    keywords={item.hint ? [item.hint] : undefined}
                    onSelect={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-baseline justify-between gap-4 rounded-control px-3 py-2.5 text-sm data-[selected=true]:bg-inset"
                  >
                    <span>{item.label}</span>
                    {item.hint && <span className="text-xs text-ink-soft">{item.hint}</span>}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

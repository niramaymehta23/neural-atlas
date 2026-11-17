"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { motion } from "motion/react";
import { Dialog } from "radix-ui";
import { useStore } from "zustand";
import { useReducedMotion, useSpring } from "@/design/motion";
import { uiCaptions } from "./captions";
import { matchesText, paletteScore } from "./palette-search";
import { paletteStore, setPaletteOpen } from "./palette-store";

export type PaletteItem = {
  id: string;
  label: string;
  /** Searched too: the real term, the idea, what you play with, the world. */
  keywords?: readonly string[];
  /** A side note (the real term), shown only when the search found it, or with `showHint`. */
  hint?: string;
  showHint?: boolean;
};

type CommandPaletteProps = {
  items: readonly PaletteItem[];
  onSelect: (id: string) => void;
};

const TITLE = uiCaptions.palette.title;

/**
 * Jump to any idea by name. Opens with Cmd+K or Ctrl+K, or a `PaletteTrigger` anywhere on the
 * page. Matches whole words of the name and its keywords, names first.
 */
export function CommandPalette({ items, onSelect }: CommandPaletteProps) {
  const open = useStore(paletteStore, ({ open }) => open);
  const [search, setSearch] = useState("");
  const reduced = useReducedMotion();
  const transition = useSpring("gentle");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(!paletteStore.getState().open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const hintShown = (item: PaletteItem) =>
    Boolean(
      item.hint &&
      (item.showHint ||
        (search.trim() && matchesText(search, item.hint) && !matchesText(search, item.label))),
    );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setPaletteOpen(next);
        if (!next) setSearch("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content
          aria-describedby={undefined}
          // The chosen page moves focus to its own heading; returning it to the trigger would steal it.
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="fixed inset-x-0 top-[18vh] z-50 mx-auto w-[min(92vw,34rem)]"
        >
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="overflow-hidden rounded-card border border-hairline bg-card text-ink"
          >
            <Dialog.Title className="sr-only">{TITLE}</Dialog.Title>
            <Command label={TITLE} filter={paletteScore}>
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder={uiCaptions.palette.placeholder}
                className="w-full border-b border-hairline bg-transparent px-5 py-4 text-base outline-2 -outline-offset-2 outline-transparent placeholder:text-ink-soft focus-visible:outline-accent-ink"
              />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-ink-soft">
                  {uiCaptions.palette.empty}
                </Command.Empty>
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    keywords={[...(item.hint ? [item.hint] : []), ...(item.keywords ?? [])]}
                    onSelect={() => {
                      onSelect(item.id);
                      setPaletteOpen(false);
                      setSearch("");
                    }}
                    className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-control px-3 py-2.5 text-sm data-[selected=true]:bg-inset"
                  >
                    <span>{item.label}</span>
                    {hintShown(item) && (
                      <span data-hint className="text-xs text-ink-soft">
                        {item.hint}
                      </span>
                    )}
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

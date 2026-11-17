"use client";

import { useSyncExternalStore } from "react";
import { uiCaptions } from "./captions";
import { setPaletteOpen } from "./palette-store";

const ignore = () => () => undefined;
const isApple = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Opens the command palette. The shortcut hint is hidden on touch screens, which have no keys. */
export function PaletteTrigger() {
  const shortcut = useSyncExternalStore(
    ignore,
    () => (isApple() ? "⌘ K" : "Ctrl K"),
    () => "Ctrl K",
  );
  return (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      aria-keyshortcuts="Meta+K Control+K"
      className="inline-flex min-h-11 items-center gap-3 rounded-pill border border-hairline bg-card px-4 py-2 text-sm text-ink-soft md:min-h-0"
    >
      {uiCaptions.palette.title}
      <kbd
        data-shortcut
        className="rounded-inner bg-inset px-1.5 py-0.5 font-sans text-xs text-ink pointer-coarse:hidden"
      >
        {shortcut}
      </kbd>
    </button>
  );
}

"use client";

import type { ReactElement } from "react";
import { Tooltip } from "radix-ui";

type HoverNoteProps = {
  /** One plain sentence: what this is and what it is doing right now. */
  note: string;
  /** The thing being explained; it must be focusable so keyboards reach the note too. */
  children: ReactElement;
};

/** A small paper note on hover or keyboard focus. */
export function HoverNote({ note, children }: HoverNoteProps) {
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={8}
            className="max-w-64 rounded-control border border-hairline bg-card px-3 py-2 text-sm text-ink"
          >
            {note}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

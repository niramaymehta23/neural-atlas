"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type ReactElement } from "react";
import { Popover } from "radix-ui";

type HoverNoteProps = {
  /** One plain sentence: what this is and what it is doing right now. */
  note: string;
  /** The thing being explained; it must be focusable so keyboards reach the note too. */
  children: ReactElement;
};

const HOVER_DELAY_MS = 250;

/**
 * A small paper note on hover, keyboard focus, or a click or tap (touch has no hover, A11Y-20).
 * The thing keeps focus and its own click; Escape or a tap elsewhere closes the note.
 */
export function HoverNote({ note, children }: HoverNoteProps) {
  const [open, setOpen] = useState(false);
  const noteId = useId();
  const timer = useRef<number | undefined>(undefined);
  const later = (next: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), next ? HOVER_DELAY_MS : 0);
  };
  const now = (next: boolean) => {
    window.clearTimeout(timer.current);
    setOpen(next);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const byMouse = (event: PointerEvent) => event.pointerType === "mouse";

  return (
    <Popover.Root open={open} onOpenChange={now}>
      <Popover.Anchor
        asChild
        aria-describedby={open ? noteId : undefined}
        onPointerEnter={(event: PointerEvent) => byMouse(event) && later(true)}
        onPointerLeave={(event: PointerEvent) => byMouse(event) && later(false)}
        onFocus={() => now(true)}
        onBlur={() => now(false)}
        onClick={() => now(true)}
      >
        {children}
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          id={noteId}
          role="tooltip"
          sideOffset={8}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="max-w-64 rounded-control border border-hairline bg-card px-3 py-2 text-sm text-ink"
        >
          {note}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { uiCaptions } from "../captions";

/** Opens the card of an idea, by its lesson's id. */
export type OpenIdeaCard = (id: string) => void;

const IdeaCardContext = createContext<OpenIdeaCard | null>(null);

/** Puts idea cards within reach of every caption beneath it. */
export function IdeaCardScope({ open, children }: { open: OpenIdeaCard; children: ReactNode }) {
  return <IdeaCardContext value={open}>{children}</IdeaCardContext>;
}

/** Opens idea cards, or null where nothing can. */
export const useIdeaCard = (): OpenIdeaCard | null => useContext(IdeaCardContext);

/**
 * The little button after a caption that opens the card of the idea it is about. Without a scope
 * (or an idea) there is nothing to open, so there is no button.
 */
export function IdeaCardButton({ about, className = "" }: { about?: string; className?: string }) {
  const open = useIdeaCard();
  if (!open || !about) return null;
  return (
    <button
      type="button"
      data-idea-card={about}
      onClick={() => open(about)}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill text-sm text-accent-ink underline-offset-4 hover:underline md:min-h-8 ${className}`}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <rect x="2" y="3.5" width="9" height="11" rx="1.5" />
        <path d="M5 3.5V2.8A1.3 1.3 0 0 1 6.3 1.5H12.7A1.3 1.3 0 0 1 14 2.8V10.7A1.3 1.3 0 0 1 12.7 12H11" />
      </svg>
      {uiCaptions.ideaCard}
    </button>
  );
}

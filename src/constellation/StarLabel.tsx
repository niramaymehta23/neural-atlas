"use client";

import type { Ref } from "react";
import type { Lesson } from "@/platform/contract";
import { constellationCaptions as captions } from "./captions";
import { statusWords, type StarStatus } from "./status";

type StarLabelProps = {
  lesson: Pick<Lesson, "title" | "idea">;
  status: StarStatus;
  /** Opened by a tap: it carries an Open button, since a finger cannot hover. */
  touched: boolean;
  onOpen: () => void;
  /** The outer box, slid around to keep the card inside the map. */
  outerRef: Ref<HTMLDivElement>;
  cardRef: Ref<HTMLDivElement>;
};

/** A star's paper label: its everyday name, the idea in a line, and what it means to you. */
export function StarLabel({ lesson, status, touched, onOpen, outerRef, cardRef }: StarLabelProps) {
  const words = statusWords(status);
  return (
    <div ref={outerRef}>
      <div
        ref={cardRef}
        role={touched ? undefined : "tooltip"}
        className="w-60 max-w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-full rounded-control border border-hairline bg-card px-3 py-2 text-ink shadow-lifted"
      >
        <p className="font-serif text-base">{lesson.title}</p>
        <p className="text-sm text-ink-soft">{lesson.idea}</p>
        {words && <p className="mt-1 text-xs text-ink">{words}</p>}
        {touched && (
          <button
            type="button"
            // Keep focus on the star, so the label stays open until the tap lands.
            onMouseDown={(event) => event.preventDefault()}
            onClick={onOpen}
            className="pointer-events-auto mt-2 min-h-11 rounded-pill border border-accent-ink bg-paper px-4 text-sm text-accent-ink"
          >
            {captions.open}
          </button>
        )}
      </div>
    </div>
  );
}

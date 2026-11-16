"use client";

import { useState } from "react";
import { Collapsible } from "radix-ui";
import { PaperCard } from "./PaperCard";

type MissionCardProps = {
  /** The goal in plain words: "Make it forget everything it learned". */
  goal: string;
  done: boolean;
  /** An optional nudge, hidden until asked for. */
  hint?: string;
};

/** The break-it mission in the corner: a goal, a hint on request, and a quiet tick when done. */
export function MissionCard({ goal, done, hint }: MissionCardProps) {
  const [hintOpen, setHintOpen] = useState(false);
  return (
    <PaperCard role="region" aria-label="Mission" className="flex max-w-sm flex-col gap-3">
      <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-ink-soft uppercase">
        <span aria-hidden className={`size-2 rounded-pill ${done ? "bg-good" : "bg-accent"}`} />
        {done ? "Mission done" : "Mission"}
      </p>
      <p className={`font-serif text-lg leading-snug ${done ? "text-ink-soft" : "text-ink"}`}>
        {goal}
      </p>
      {hint && !done && (
        <Collapsible.Root open={hintOpen} onOpenChange={setHintOpen}>
          <Collapsible.Trigger className="text-sm text-accent underline-offset-4 hover:underline">
            {hintOpen ? "Hide the hint" : "Need a hint?"}
          </Collapsible.Trigger>
          <Collapsible.Content className="pt-2 text-sm text-ink-soft">{hint}</Collapsible.Content>
        </Collapsible.Root>
      )}
    </PaperCard>
  );
}

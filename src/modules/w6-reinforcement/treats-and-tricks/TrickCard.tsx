import { motion } from "motion/react";
import { useSpring } from "@/design/motion";
import { words } from "./captions";
import type { Trick } from "./model";
import { Puppy } from "./Puppy";

type TrickCardProps = {
  trick: Trick;
  /** How often it does this trick now (0–1): the bar's length. */
  share: number;
  /** It is doing this trick this round: a thick ink border and a "Now" tag. */
  doing: boolean;
  /** The trick you want (sit): a paw print beside its name. */
  wanted: boolean;
};

/** One trick on the mat: its picture, its name and a bar for how often the puppy does it. */
export function TrickCard({ trick, share, doing, wanted }: TrickCardProps) {
  const transition = useSpring("gentle");
  const name = words.tricks[trick];
  const often = words.often(share);
  return (
    <li
      aria-label={words.cardLabel(name, often)}
      data-card={trick}
      data-doing={doing || undefined}
      className={`relative flex flex-col gap-1 rounded-card bg-card p-2 ${doing ? "border-[3px] border-ink" : "border border-hairline"}`}
    >
      <span
        aria-hidden
        className={`absolute top-1 right-1 rounded-pill bg-ink px-2 text-xs font-semibold text-paper ${doing ? "" : "invisible"}`}
      >
        {words.now}
      </span>
      <svg viewBox="0 0 100 80" className="mx-auto h-12 w-auto" aria-hidden>
        <Puppy trick={trick} />
      </svg>
      <span aria-hidden className="flex items-center gap-1 text-sm font-medium">
        {wanted && (
          <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden>
            <circle cx={6} cy={8} r={3} fill="var(--color-ink)" />
            <circle cx={2.5} cy={4} r={1.3} fill="var(--color-ink)" />
            <circle cx={6} cy={2.5} r={1.3} fill="var(--color-ink)" />
            <circle cx={9.5} cy={4} r={1.3} fill="var(--color-ink)" />
          </svg>
        )}
        {name}
      </span>
      <span aria-hidden className="h-2.5 w-full overflow-hidden rounded-pill bg-inset">
        <motion.span
          className="block h-full rounded-pill bg-ink-soft"
          initial={false}
          animate={{ width: `${Math.round(share * 1000) / 10}%` }}
          transition={transition}
        />
      </span>
      <span aria-hidden className="text-xs text-ink-soft">
        {often}
      </span>
    </li>
  );
}

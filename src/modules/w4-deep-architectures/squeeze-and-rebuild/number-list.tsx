"use client";

import { count } from "@/design/copy";
import { words } from "./captions";
import { KEEP } from "./model";

const SLOT = 20;
const WIDTH = SLOT * KEEP.most;
const HEIGHT = 72;
const MIDDLE = HEIGHT / 2;
const REACH = MIDDLE - 4;

/**
 * The short list: one slot per number. Kept numbers are solid bars, up or down from the middle by
 * their size; thrown-away ones are empty dashed slots, so kept and dropped read without colour.
 */
export function NumberList({ numbers, keep }: { numbers: ArrayLike<number>; keep: number }) {
  let biggest = 0;
  for (let index = 0; index < numbers.length; index += 1)
    biggest = Math.max(biggest, Math.abs(numbers[index] ?? 0));
  const label =
    keep >= KEEP.most ? words.list.allKept : words.list.label(count(keep), count(KEEP.most - keep));
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="text-xs text-ink-soft">{words.list.heading}</figcaption>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full rounded-card border border-hairline bg-paper"
        data-kept={keep}
      >
        <line x1={0} x2={WIDTH} y1={MIDDLE} y2={MIDDLE} stroke="var(--color-hairline)" />
        {Array.from({ length: KEEP.most }, (_, index) => {
          const x = index * SLOT + 3;
          if (index >= keep)
            return (
              <rect
                key={index}
                x={x}
                y={6}
                width={SLOT - 6}
                height={HEIGHT - 12}
                rx={3}
                fill="none"
                stroke="var(--color-ink-soft)"
                strokeDasharray="3 3"
                data-dropped
              />
            );
          const value = numbers[index] ?? 0;
          const size = biggest > 0 ? (Math.abs(value) / biggest) * REACH : 0;
          return (
            <rect
              key={index}
              x={x}
              y={value >= 0 ? MIDDLE - size : MIDDLE}
              width={SLOT - 6}
              height={Math.max(1.5, size)}
              rx={2}
              fill="var(--color-ink)"
              data-kept
            />
          );
        })}
      </svg>
      <div aria-hidden className="flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 10 10" className="size-2.5">
            <rect x={1} y={1} width={8} height={8} fill="var(--color-ink)" />
          </svg>
          {words.list.key.kept}
        </span>
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 10 10" className="size-2.5">
            <rect
              x={1}
              y={1}
              width={8}
              height={8}
              fill="none"
              stroke="var(--color-ink-soft)"
              strokeDasharray="2 2"
            />
          </svg>
          {words.list.key.dropped}
        </span>
      </div>
    </figure>
  );
}

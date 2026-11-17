"use client";

import { useId, type KeyboardEvent } from "react";
import { count } from "@/design/copy";
import { useHoldDrag } from "@/features/building/use-hold-drag";
import { snapToStep, valueForKey } from "@/ui/keyboard-step";
import { words } from "./captions";

const RANGE = { min: 0, max: 1, step: 0.01 };

/** A bar height in words. */
export const sizeWords = (bar: number) =>
  bar < 0.01
    ? words.size.none
    : bar < 0.15
      ? words.size.tiny
      : bar < 0.35
        ? words.size.small
        : bar < 0.5
          ? words.size.big
          : words.size.huge;

type PlanBarsProps = {
  plan: readonly number[];
  /** The part of the walk on screen now, marked under its bar. */
  current: number | null;
  onChange?: (part: number, bar: number) => void;
};

/** The step plan as six bars from start to finish; each bar is a slider. */
export function PlanBars({ plan, current, onChange }: PlanBarsProps) {
  const instructionsId = useId();
  return (
    <figure className="flex flex-col gap-1" data-plan-bars>
      <figcaption className="text-sm">{words.bars.title}</figcaption>
      <p id={instructionsId} className="sr-only">
        {words.bars.instructions}
      </p>
      <div className="grid grid-cols-6 gap-2">
        {plan.map((bar, part) => (
          <Bar
            key={part}
            part={part}
            bar={bar}
            now={current === part}
            describedBy={instructionsId}
            onChange={onChange ? (next) => onChange(part, next) : undefined}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-soft">
        <span>{words.bars.start}</span>
        <span>{words.bars.finish}</span>
      </div>
    </figure>
  );
}

function Bar({
  part,
  bar,
  now,
  describedBy,
  onChange,
}: {
  part: number;
  bar: number;
  now: boolean;
  describedBy: string;
  onChange?: (bar: number) => void;
}) {
  const { ref, handlers } = useHoldDrag<HTMLDivElement>({
    onDrag: ({ clientY }) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box || box.height === 0 || !onChange) return;
      onChange(snapToStep(1 - (clientY - box.top) / box.height, RANGE));
    },
  });
  const onKeyDown = (event: KeyboardEvent) => {
    const next = valueForKey(event.key, bar, RANGE);
    if (next === null || !onChange) return;
    event.preventDefault();
    onChange(next);
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={ref}
        role="slider"
        tabIndex={onChange ? 0 : -1}
        aria-label={words.bars.label(count(part + 1))}
        aria-valuemin={RANGE.min}
        aria-valuemax={RANGE.max}
        aria-valuenow={bar}
        aria-valuetext={sizeWords(bar)}
        aria-orientation="vertical"
        aria-readonly={!onChange}
        aria-describedby={describedBy}
        onKeyDown={onKeyDown}
        {...(onChange ? handlers : {})}
        className={`relative h-24 w-full touch-manipulation overflow-hidden rounded-control border bg-card ${now ? "border-2 border-ink" : "border-hairline"} ${onChange ? "cursor-ns-resize" : ""}`}
        data-part={part}
      >
        <div
          className="absolute inset-x-1 bottom-0 rounded-t-control border border-ink bg-flow"
          style={{ height: `${Math.round(bar * 100)}%` }}
        />
      </div>
      <span className="h-4 text-xs text-ink-soft">{now ? words.bars.now : ""}</span>
    </div>
  );
}

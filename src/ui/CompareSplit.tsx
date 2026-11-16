"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { valueForKey } from "./keyboard-step";

type CompareSplitProps = {
  /** What is being compared, such as "With and without forgetting". */
  label: string;
  left: ReactNode;
  right: ReactNode;
  leftLabel: string;
  rightLabel: string;
  className?: string;
};

const RANGE = { min: 5, max: 95, step: 5 };

/** Two settings side by side over the same scene; drag the divider (or use arrows) to compare. */
export function CompareSplit({
  label,
  left,
  right,
  leftLabel,
  rightLabel,
  className = "",
}: CompareSplitProps) {
  const [split, setSplit] = useState(50);
  const frame = useRef<HTMLDivElement>(null);

  const followPointer = (event: PointerEvent) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const percent = ((event.clientX - box.left) / box.width) * 100;
    setSplit(Math.min(RANGE.max, Math.max(RANGE.min, percent)));
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const next = valueForKey(event.key, split, RANGE);
    if (next === null) return;
    event.preventDefault();
    setSplit(next);
  };

  return (
    <div
      ref={frame}
      className={`relative overflow-hidden rounded-card border border-hairline bg-card ${className}`}
    >
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        {left}
      </div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
        {right}
      </div>
      <span className="absolute top-3 left-3 rounded-pill bg-paper px-2.5 py-0.5 text-xs text-ink-soft">
        {leftLabel}
      </span>
      <span className="absolute top-3 right-3 rounded-pill bg-paper px-2.5 py-0.5 text-xs text-ink-soft">
        {rightLabel}
      </span>
      <div
        role="separator"
        tabIndex={0}
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={RANGE.min}
        aria-valuemax={RANGE.max}
        aria-valuenow={Math.round(split)}
        aria-valuetext={`${Math.round(split)} percent shows ${leftLabel}`}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          followPointer(event);
        }}
        onPointerMove={(event) =>
          event.currentTarget.hasPointerCapture(event.pointerId) && followPointer(event)
        }
        className="absolute inset-y-0 -ml-3 flex w-6 cursor-ew-resize touch-none justify-center"
        style={{ left: `${split}%` }}
      >
        <span className="h-full w-px bg-hairline" />
        <span className="absolute top-1/2 size-5 -translate-y-1/2 rounded-pill border-2 border-paper bg-accent" />
      </div>
    </div>
  );
}

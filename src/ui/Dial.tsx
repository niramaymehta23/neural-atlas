"use client";

import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { motion } from "motion/react";
import { useSpring } from "@/design/motion";
import { snapToStep, valueForKey } from "./keyboard-step";

type DialProps = {
  /** Plain-language name, such as "How big a step". */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Words for the current value, read aloud and shown under the dial. */
  describe?: (value: number) => string;
};

const SWEEP_DEGREES = 270;
const DRAG_PX_FOR_FULL_TURN = 220;
const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC = (SWEEP_DEGREES / 360) * CIRCUMFERENCE;
/** Where the sweep starts, in screen degrees (clockwise from 3 o'clock): bottom left. */
const START_DEGREES = 135;
/** A press further out than this (as a share of the dial's half-width) is on the arc. */
const ARC_INNER = 0.6;

/**
 * The share of the sweep under a point on the arc, or null when the point is inside the knob.
 * Presses in the gap at the bottom go to the nearer end.
 */
export function fractionAt(dx: number, dy: number, half: number): number | null {
  if (half <= 0 || Math.hypot(dx, dy) < half * ARC_INNER) return null;
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
  const along = (((degrees - START_DEGREES) % 360) + 360) % 360;
  if (along <= SWEEP_DEGREES) return along / SWEEP_DEGREES;
  return along > SWEEP_DEGREES + (360 - SWEEP_DEGREES) / 2 ? 0 : 1;
}

/** A round knob with a plain name. Tap the arc, drag up or down, or use the arrow keys. */
export function Dial({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  describe,
}: DialProps) {
  const labelId = useId();
  const drag = useRef<{ y: number; value: number } | null>(null);
  const transition = useSpring("gentle");
  const fraction = max > min ? (value - min) / (max - min) : 0;
  const words = describe?.(value);

  const onKeyDown = (event: KeyboardEvent) => {
    const next = valueForKey(event.key, value, { min, max, step });
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const box = event.currentTarget.getBoundingClientRect();
    const half = box.width / 2;
    const tapped = fractionAt(
      event.clientX - box.left - half,
      event.clientY - box.top - box.height / 2,
      half,
    );
    const start =
      tapped === null ? value : snapToStep(min + tapped * (max - min), { min, max, step });
    if (start !== value) onChange(start);
    drag.current = { y: event.clientY, value: start };
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!drag.current) return;
    const moved = ((drag.current.y - event.clientY) / DRAG_PX_FOR_FULL_TURN) * (max - min);
    onChange(snapToStep(drag.current.value + moved, { min, max, step }));
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="slider"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={words}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="size-20 cursor-grab touch-none rounded-pill active:cursor-grabbing"
      >
        <svg viewBox="0 0 80 80" className="size-full" aria-hidden>
          <g transform="rotate(135 40 40)" fill="none" strokeWidth="5" strokeLinecap="round">
            <circle
              cx="40"
              cy="40"
              r={RADIUS}
              strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
              className="stroke-inset"
            />
            <motion.circle
              cx="40"
              cy="40"
              r={RADIUS}
              initial={false}
              animate={{ strokeDasharray: `${fraction * ARC} ${CIRCUMFERENCE}` }}
              transition={transition}
              className="stroke-ink"
            />
          </g>
          <circle cx="40" cy="40" r="24" strokeWidth="1" className="fill-card stroke-hairline" />
          <motion.g
            initial={false}
            animate={{ rotate: -SWEEP_DEGREES / 2 + fraction * SWEEP_DEGREES }}
            transition={transition}
          >
            <rect width="80" height="80" fill="none" />
            <circle cx="40" cy="23" r="5" strokeWidth="1.5" className="fill-accent stroke-ink" />
          </motion.g>
        </svg>
      </div>
      <span id={labelId} className="text-sm font-medium text-ink">
        {label}
      </span>
      {words && <span className="text-xs text-ink-soft">{words}</span>}
    </div>
  );
}

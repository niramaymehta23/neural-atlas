"use client";

import { useId } from "react";
import { Slider as RadixSlider } from "radix-ui";

type SliderProps = {
  /** Plain-language name, such as "How many examples". */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Words for the current value, read aloud and shown beside the label. */
  describe?: (value: number) => string;
};

/** A straight slider with a plain name; the clay thumb is the thing you touch. */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  describe,
}: SliderProps) {
  const labelId = useId();
  const words = describe?.(value);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span id={labelId} className="font-medium text-ink">
          {label}
        </span>
        {words && <span className="text-ink-soft">{words}</span>}
      </div>
      <RadixSlider.Root
        className="relative flex h-6 touch-none items-center select-none"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => next !== undefined && onChange(next)}
      >
        <RadixSlider.Track className="relative h-1.5 grow rounded-pill bg-inset">
          <RadixSlider.Range className="absolute h-full rounded-pill bg-ink-soft" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          aria-labelledby={labelId}
          aria-valuetext={words}
          className="block size-5 cursor-grab rounded-pill border-2 border-paper bg-accent transition-transform duration-200 ease-settle hover:scale-110 active:cursor-grabbing"
        />
      </RadixSlider.Root>
    </div>
  );
}

"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { ToggleGroup } from "radix-ui";
import { useSpring } from "@/design/motion";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Pick one of a few choices. Arrow keys move between them; one is always chosen. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const pillId = useId();
  const transition = useSpring("gentle");
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        const chosen = options.find((option) => option.value === next);
        if (chosen) onChange(chosen.value);
      }}
      className="inline-flex gap-1 rounded-control bg-inset p-1"
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className="relative rounded-inner px-4 py-1.5 text-sm text-ink-soft transition-colors duration-200 ease-settle data-[state=on]:text-ink"
        >
          {option.value === value && (
            <motion.span
              layoutId={pillId}
              transition={transition}
              className="absolute inset-0 rounded-inner border border-hairline bg-paper"
            />
          )}
          <span className="relative">{option.label}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

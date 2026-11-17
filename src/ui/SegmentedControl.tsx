"use client";

import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { ToggleGroup } from "radix-ui";
import { useSpring } from "@/design/motion";

type Option<T extends string> = {
  value: T;
  label: string;
  /** A small picture beside the words, such as the shape a group is drawn with. */
  icon?: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Stack the choices as a list; lists of more than three always stack. */
  vertical?: boolean;
  /** Show the name above the choices, not only to screen readers. */
  showLabel?: boolean;
};

/** More choices than this do not fit side by side in a narrow dock (A11Y-16). */
const MOST_SIDE_BY_SIDE = 3;

/**
 * Pick one of a few choices. Arrow keys move between them; one is always chosen. A few short
 * choices sit side by side (wrapping if they must); longer lists stack as a radio list.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  vertical = options.length > MOST_SIDE_BY_SIDE,
  showLabel = false,
}: SegmentedControlProps<T>) {
  const pillId = useId();
  const labelId = useId();
  const transition = useSpring("gentle");
  const group = (
    <ToggleGroup.Root
      type="single"
      orientation={vertical ? "vertical" : "horizontal"}
      {...(showLabel ? { "aria-labelledby": labelId } : { "aria-label": label })}
      value={value}
      onValueChange={(next) => {
        const chosen = options.find((option) => option.value === next);
        if (chosen) onChange(chosen.value);
      }}
      data-layout={vertical ? "list" : "row"}
      className={`max-w-full gap-1 rounded-control bg-inset p-1 ${vertical ? "flex flex-col" : "inline-flex flex-wrap"}`}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={`relative flex items-center gap-2 rounded-inner py-1.5 text-sm text-ink-soft transition-colors duration-200 ease-settle data-[state=on]:text-ink pointer-coarse:min-h-11 ${vertical ? "px-3 text-left" : "justify-center px-4"}`}
        >
          {option.value === value && (
            <motion.span
              layoutId={pillId}
              transition={transition}
              className="absolute inset-0 rounded-inner border border-hairline bg-paper"
            />
          )}
          {vertical && (
            <span
              aria-hidden
              className="relative grid size-3.5 shrink-0 place-items-center rounded-pill border border-ink-soft"
            >
              {option.value === value && <span className="size-1.5 rounded-pill bg-ink" />}
            </span>
          )}
          {option.icon && (
            <span aria-hidden className="relative flex">
              {option.icon}
            </span>
          )}
          <span className="relative">{option.label}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
  if (!showLabel) return group;
  return (
    <div className="flex max-w-full flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium text-ink">
        {label}
      </span>
      {group}
    </div>
  );
}

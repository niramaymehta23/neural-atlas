"use client";

import { useId } from "react";
import { Switch } from "radix-ui";

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * An on/off switch with a plain name. Space or Enter flips it. Off is an outlined track; on is
 * clay with a tick on the knob, so the state never rests on colour alone.
 */
export function Toggle({ label, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative h-6 w-11 shrink-0 cursor-pointer rounded-pill border border-ink-soft bg-inset transition-colors duration-200 ease-settle before:absolute before:-inset-y-2.5 before:inset-x-0 data-[state=checked]:border-accent-ink data-[state=checked]:bg-accent"
      >
        <Switch.Thumb className="grid size-5 translate-x-px place-items-center rounded-pill border border-ink-soft bg-knob transition-transform duration-200 ease-settle data-[state=checked]:translate-x-[21px] data-[state=checked]:border-accent-ink">
          {checked && (
            <svg data-tick viewBox="0 0 12 12" className="size-3" aria-hidden>
              <path
                d="M2.5 6.5 L5 9 L9.5 3.5"
                fill="none"
                stroke="var(--color-accent-ink)"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </Switch.Thumb>
      </Switch.Root>
      <label htmlFor={id} className="cursor-pointer text-sm text-ink">
        {label}
      </label>
    </div>
  );
}

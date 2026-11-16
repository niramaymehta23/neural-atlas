"use client";

import { useId } from "react";
import { Switch } from "radix-ui";

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** An on/off switch with a plain name. Space or Enter flips it. */
export function Toggle({ label, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative h-6 w-11 shrink-0 cursor-pointer rounded-pill bg-inset transition-colors duration-200 ease-settle data-[state=checked]:bg-accent"
      >
        <Switch.Thumb className="block size-5 translate-x-0.5 rounded-pill bg-knob transition-transform duration-200 ease-settle data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
      <label htmlFor={id} className="cursor-pointer text-sm text-ink">
        {label}
      </label>
    </div>
  );
}

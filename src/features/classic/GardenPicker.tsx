"use client";

type GardenPickerProps<T extends string> = {
  /** "Start from". */
  label: string;
  options: readonly T[];
  value: T;
  /** The plain name of each garden. */
  names: Record<T, string>;
  onPick: (garden: T) => void;
};

/** A row of pressable garden names; picking one replants the garden. */
export function GardenPicker<T extends string>({
  label,
  options,
  value,
  names,
  onPick,
}: GardenPickerProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2 text-sm">
      <span aria-hidden className="text-ink-soft">
        {label}
      </span>
      {options.map((garden) => (
        <button
          key={garden}
          type="button"
          aria-pressed={value === garden}
          onClick={() => onPick(garden)}
          className="min-h-11 rounded-pill border border-hairline px-3 py-1 aria-pressed:border-accent aria-pressed:bg-paper md:min-h-0"
        >
          {names[garden]}
        </button>
      ))}
    </div>
  );
}

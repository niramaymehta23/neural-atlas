type Range = { min: number; max: number; step: number };

/** Clamps to the range and lands exactly on a step (no 0.11000000000000001). */
export function snapToStep(value: number, { min, max, step }: Range): number {
  const steps = Math.round((Math.min(max, Math.max(min, value)) - min) / step);
  return Number((min + steps * step).toFixed(10));
}

/** The value a slider-like control should take for a key press, or null if the key is not ours. */
export function valueForKey(key: string, value: number, range: Range): number | null {
  const page = range.step * 10;
  const next: Record<string, number> = {
    ArrowUp: value + range.step,
    ArrowRight: value + range.step,
    ArrowDown: value - range.step,
    ArrowLeft: value - range.step,
    PageUp: value + page,
    PageDown: value - page,
    Home: range.min,
    End: range.max,
  };
  const target = next[key];
  return target === undefined ? null : snapToStep(target, range);
}

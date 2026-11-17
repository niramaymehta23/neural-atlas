"use client";

import { useEffect, useRef } from "react";
import { inkTone } from "@/design/encodings";
import { useColourTable } from "@/design/paint";

type Props = {
  /** side × side values in 0–1, row by row: 0 is bare paper, 1 is full ink. */
  values: ArrayLike<number> | null;
  side: number;
  /** What the map shows, read out as an image. */
  label: string;
  /** Only the first `rows` rows are drawn; the rest stays bare (a sweep still under way). */
  rows?: number;
  className?: string;
};

/**
 * A grey map drawn as ink on paper (light on charcoal at night): a picture's brightness, or how
 * strongly a pattern was found at each spot. Square, and as wide as its box.
 */
export function ValueMap({ values, side, label, rows = side, className = "" }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const table = useColourTable(inkTone);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const image = context.createImageData(side, side);
    const shown = Math.max(0, Math.min(side, rows));
    for (let spot = 0; spot < side * side; spot += 1) {
      const drawn = values && Math.floor(spot / side) < shown;
      const value = drawn ? Math.min(1, Math.max(0, values[spot] ?? 0)) : 0;
      const at = Math.round(value * 255) * 3;
      image.data[spot * 4] = table[at] ?? 0;
      image.data[spot * 4 + 1] = table[at + 1] ?? 0;
      image.data[spot * 4 + 2] = table[at + 2] ?? 0;
      image.data[spot * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }, [values, side, rows, table]);
  return (
    <canvas
      ref={canvas}
      width={side}
      height={side}
      role="img"
      aria-label={label}
      className={`aspect-square h-auto w-full rounded-card border border-hairline bg-paper ${className}`}
    />
  );
}

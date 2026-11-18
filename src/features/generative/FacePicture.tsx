"use client";

import { useEffect, useRef } from "react";
import { inkTone } from "@/design/encodings";
import { useColourTable } from "@/design/paint";
import { SIDE } from "@/engine/generative/faces";

/** Ink amounts (0–1, 32 × 32) as RGBA pixels, through a theme colour table. */
export function paintPixels(
  picture: ArrayLike<number>,
  table: Uint8ClampedArray,
  into: Uint8ClampedArray,
) {
  const steps = table.length / 3;
  for (let pixel = 0; pixel < SIDE * SIDE; pixel += 1) {
    const value = Math.min(1, Math.max(0, picture[pixel] ?? 0));
    const row = Math.round(value * (steps - 1)) * 3;
    into[pixel * 4] = table[row] ?? 0;
    into[pixel * 4 + 1] = table[row + 1] ?? 0;
    into[pixel * 4 + 2] = table[row + 2] ?? 0;
    into[pixel * 4 + 3] = 255;
  }
}

/**
 * A 32 × 32 grey picture, ink on paper by day and light on charcoal at night, scaled smoothly to
 * whatever size its box is. `label` is what a screen reader hears; without one the picture is
 * decoration inside something already named (a labelled button) and is hidden from screen readers.
 */
export function FacePicture({
  picture,
  label,
  className = "",
}: {
  picture: ArrayLike<number>;
  label?: string;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const table = useColourTable(inkTone);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const image = context.createImageData(SIDE, SIDE);
    paintPixels(picture, table, image.data);
    context.putImageData(image, 0, 0);
  }, [picture, table]);
  return (
    <canvas
      ref={canvas}
      width={SIDE}
      height={SIDE}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={`aspect-square rounded-card border border-hairline bg-paper ${className}`}
    />
  );
}

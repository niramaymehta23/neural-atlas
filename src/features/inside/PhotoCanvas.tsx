"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** side × side RGBA bytes, or null to show bare paper while a picture is on its way. */
  pixels: Uint8ClampedArray | null;
  side: number;
  label: string;
  /** Draw it mirrored, as a camera picture of the learner reads naturally. */
  mirrored?: boolean;
  /** Draw each dot as a crisp square when the picture is smaller than its box (a shrunk picture). */
  pixelated?: boolean;
};

/** A colour picture from bytes (a sample photo, a camera snap, a smudged or shrunk picture). */
export function PhotoCanvas({ pixels, side, label, mirrored = false, pixelated = false }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    if (!pixels || pixels.length !== side * side * 4) {
      context.clearRect(0, 0, side, side);
      return;
    }
    context.putImageData(new ImageData(new Uint8ClampedArray(pixels), side, side), 0, 0);
  }, [pixels, side]);
  return (
    <canvas
      ref={canvas}
      width={side}
      height={side}
      role="img"
      aria-label={label}
      className={`aspect-square h-auto w-full rounded-card border border-hairline bg-paper ${mirrored ? "-scale-x-100" : ""} ${pixelated ? "[image-rendering:pixelated]" : ""}`}
    />
  );
}

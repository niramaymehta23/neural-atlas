"use client";

import { useEffect, useMemo, useRef } from "react";
import { regionTone } from "@/design/encodings";
import { colourTable } from "@/design/paint";
import { useTheme } from "@/design/use-theme";
import { paintField, SURENESS_STEPS } from "./paint-field";

type DecisionFieldProps = {
  /** Model outputs for `gridInputs(resolution)`: one chance per cell (two groups) or shares. */
  outputs: Float32Array | null;
  groups: number;
  resolution?: number;
  className?: string;
};

/** Performance mark name for one redraw, so tests can hold it under a frame (16 ms). */
export const FIELD_PAINT_MEASURE = "decision-field-paint";

/** The model's opinion of every spot, as soft colour regions under the points. */
export function DecisionField({
  outputs,
  groups,
  resolution = 128,
  className = "",
}: DecisionFieldProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  // Resolved once per theme and group count, not per redraw.
  const tables = useMemo(
    () =>
      typeof document === "undefined"
        ? []
        : Array.from({ length: groups }, (_, group) =>
            colourTable((sureness) => regionTone(group, sureness), SURENESS_STEPS),
          ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the theme changes what tokens resolve to.
    [groups, theme],
  );

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context || !outputs) return;
    const start = performance.now();
    const image = context.createImageData(resolution, resolution);
    paintField(image.data, outputs, groups, tables);
    context.putImageData(image, 0, 0);
    performance.measure(FIELD_PAINT_MEASURE, { start, end: performance.now() });
  }, [outputs, groups, resolution, tables]);

  return (
    <canvas
      ref={canvas}
      width={resolution}
      height={resolution}
      aria-hidden
      className={`size-full ${className}`}
    />
  );
}

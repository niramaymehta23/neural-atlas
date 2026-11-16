"use client";

import { useMemo } from "react";
import { useTheme } from "./use-theme";

/**
 * Canvas pixels and WebGL vertices cannot read CSS variables or color-mix, so this turns the
 * strings from encodings.ts into RGB bytes in the current theme. Browser only.
 */
export type Rgb = readonly [number, number, number];

let pixel: CanvasRenderingContext2D | null = null;

/** sRGB bytes for each CSS colour, resolved together (one style pass). */
export function resolveColours(colours: readonly string[]): Rgb[] {
  const probes = colours.map((colour) => {
    const probe = document.createElement("span");
    probe.style.color = colour;
    probe.style.display = "none";
    document.body.append(probe);
    return probe;
  });
  const computed = probes.map((probe) => getComputedStyle(probe).color);
  for (const probe of probes) probe.remove();

  pixel ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  return computed.map((colour) => {
    if (!pixel) return [0, 0, 0];
    pixel.clearRect(0, 0, 1, 1);
    pixel.fillStyle = colour;
    pixel.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = pixel.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  });
}

/** `steps` colours sampled from a 0–1 mapping in encodings.ts, as flat RGB bytes. */
export function colourTable(map: (value: number) => string, steps = 256): Uint8ClampedArray {
  const colours = resolveColours(Array.from({ length: steps }, (_, i) => map(i / (steps - 1))));
  return Uint8ClampedArray.from(colours.flat());
}

const inBrowser = () => typeof document !== "undefined";

/** Resolved colours that follow day/night (empty while prerendering on the server). */
export function useResolvedColours(colours: readonly string[]): Rgb[] {
  const theme = useTheme();
  const key = colours.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the joined key is the dependency.
  return useMemo(() => (inBrowser() ? resolveColours(colours) : []), [key, theme]);
}

/** A colour table that follows day/night. Pass a stable mapping (a function from encodings.ts). */
export function useColourTable(map: (value: number) => string, steps = 256): Uint8ClampedArray {
  const theme = useTheme();
  return useMemo(
    () => (inBrowser() ? colourTable(map, steps) : new Uint8ClampedArray(steps * 3)),
    // The theme changes what the same tokens resolve to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map, steps, theme],
  );
}

/** A resolved colour as a canvas fill style. */
export function cssRgb([r, g, b]: Rgb): string {
  return `rgb(${r} ${g} ${b})`;
}

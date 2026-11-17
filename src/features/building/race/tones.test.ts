// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GROUND_PALETTE, RIM_PALETTE, WALKER_PALETTE } from "./tones";

/** The palette's hex colours, straight from tokens.css. */
const css = readFileSync(join(process.cwd(), "src/design/tokens.css"), "utf8");
type Rgb = [number, number, number];
function palette(name: string): Rgb {
  const hex = new RegExp(`--${name}:\\s*#([0-9a-f]{6});`, "i").exec(css)?.[1];
  if (!hex) throw new Error(`No palette colour ${name}`);
  const n = Number.parseInt(hex, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map(linear) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
/** Colour difference in OKLab, scaled so 100 spans black to white. */
function difference(a: Rgb, b: Rgb) {
  const lab = (rgb: Rgb) => {
    const [r, g, bl] = rgb.map(linear) as Rgb;
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };
  const [p, q] = [lab(a), lab(b)];
  return 100 * Math.hypot(...p.map((value, i) => value - (q[i] ?? 0)));
}

describe("walker colours (DH-08)", () => {
  const walkers = WALKER_PALETTE.map(palette);

  it("are far apart from each other", () => {
    for (let a = 0; a < walkers.length; a += 1)
      for (let b = a + 1; b < walkers.length; b += 1)
        expect(difference(walkers[a] as Rgb, walkers[b] as Rgb)).toBeGreaterThan(20);
  });

  it.each(GROUND_PALETTE)("wear a rim that stands out 3:1 from the %s end of the ground", (end) => {
    expect(contrast(palette(RIM_PALETTE), palette(end))).toBeGreaterThan(3);
  });
});

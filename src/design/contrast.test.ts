// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Resolves the semantic colours in tokens.css for each theme (following var() and oklab
 * color-mix) and checks every text and focus pairing against WCAG AA.
 */
const css = readFileSync(join(process.cwd(), "src/design/tokens.css"), "utf8");

type Rgb = [number, number, number];

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055;

function toOklab([r, g, b]: Rgb): Rgb {
  const [lr, lg, lb] = [r, g, b].map(toLinear) as Rgb;
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, fromLinear(c)))) as Rgb;
}

function resolve(value: string, vars: Record<string, string>): Rgb {
  const v = value.trim();
  const reference = /^var\(--([\w-]+)\)$/.exec(v);
  if (reference?.[1]) {
    const target = vars[reference[1]];
    if (!target) throw new Error(`Unknown token ${reference[1]}`);
    return resolve(target, vars);
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex?.[1]) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const mix = /^color-mix\(in oklab,\s*(.+?)\s+(\d+)%,\s*(.+)\)$/.exec(v);
  if (mix?.[1] && mix[2] && mix[3]) {
    const share = Number(mix[2]) / 100;
    const a = toOklab(resolve(mix[1], vars));
    const b = toOklab(resolve(mix[3], vars));
    return fromOklab(a.map((x, i) => x * share + (b[i] ?? 0) * (1 - share)) as Rgb);
  }
  if (v === "black") return [0, 0, 0];
  throw new Error(`Cannot resolve ${v}`);
}

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map(toLinear) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const day = block(":root");
const themes = { ivory: day, night: { ...day, ...block('[data-theme="night"]') } };
const SURFACES = ["paper", "card", "inset"] as const;

describe.each(Object.entries(themes))("%s theme contrast", (_theme, vars) => {
  const colour = (name: string) => resolve(`var(--${name})`, vars);

  it.each(SURFACES.flatMap((surface) => ["ink", "ink-soft"].map((text) => [text, surface])))(
    "%s text on %s reaches 4.5:1",
    (text, surface) => expect(contrast(colour(text), colour(surface))).toBeGreaterThanOrEqual(4.5),
  );

  // Clay text is for links and buttons on paper and cards; on inset it uses ink.
  it.each(["paper", "card"])("accent-ink text on %s reaches 4.5:1", (surface) =>
    expect(contrast(colour("accent-ink"), colour(surface))).toBeGreaterThanOrEqual(4.5),
  );

  it.each(SURFACES)("the focus ring (accent-ink) on %s reaches 3:1", (surface) =>
    expect(contrast(colour("accent-ink"), colour(surface))).toBeGreaterThanOrEqual(3),
  );

  it.each(SURFACES)("control outlines (ink-soft) on %s reach 3:1", (surface) =>
    expect(contrast(colour("ink-soft"), colour(surface))).toBeGreaterThanOrEqual(3),
  );
});

describe("the resolver", () => {
  it("reproduces the audited day failure, so it catches A11Y-01", () => {
    const grey = resolve("var(--warm-grey)", day);
    expect(contrast(grey, resolve("var(--paper)", day))).toBeLessThan(4.5);
  });
});

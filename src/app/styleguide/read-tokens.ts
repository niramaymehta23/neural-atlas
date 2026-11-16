import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Token = { name: string; value: string };
export type Tokens = Record<"palette" | "color" | "font" | "radius" | "shadow" | "easing", Token[]>;

function block(css: string, opener: string): string {
  const start = css.indexOf(opener);
  return start === -1 ? "" : css.slice(start, css.indexOf("\n}", start));
}

function declarations(source: string, prefix: string): Token[] {
  const pattern = new RegExp(`--(${prefix}[a-z-]+): ([^;]+);`, "g");
  return [...source.matchAll(pattern)]
    .map(([, name = "", value = ""]) => ({ name, value }))
    .filter(
      ({ name, value }) => !name.endsWith("-") && value !== "initial" && value !== "transparent",
    );
}

/** Reads tokens.css at build time, so the style guide can never drift from the real tokens. */
export function readTokens(): Tokens {
  const css = readFileSync(join(process.cwd(), "src/design/tokens.css"), "utf8");
  const theme = block(css, "@theme inline {");
  return {
    palette: declarations(block(css, ":root {"), "").filter(({ value }) => value.startsWith("#")),
    color: declarations(theme, "color-"),
    font: declarations(theme, "font-"),
    radius: declarations(theme, "radius-"),
    shadow: declarations(theme, "shadow-"),
    easing: declarations(theme, "ease-"),
  };
}

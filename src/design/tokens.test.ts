import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/design/tokens.css"), "utf8");

describe("tokens.css", () => {
  it("sets the ivory default and charcoal night backgrounds", () => {
    expect(css).toMatch(/--ivory: #faf9f5;/);
    expect(css).toMatch(/--charcoal: #1f1e1d;/);
    expect(css).toMatch(/:root \{[^}]*--paper: var\(--ivory\)/);
    expect(css).toMatch(/\[data-theme="night"\] \{[^}]*--paper: var\(--charcoal\)/);
  });

  it("has one accent, clay", () => {
    expect(css.match(/--color-accent: [^;]+;/g)).toEqual(["--color-accent: var(--clay);"]);
  });

  it("defines no glow: every shadow is tinted with ink, never a colour", () => {
    const shadows = css.match(/--shadow-[a-z]+: [^;]+;/g) ?? [];
    expect(shadows.length).toBeGreaterThan(0);
    for (const shadow of shadows) {
      expect(shadow).not.toMatch(/--(clay|sage|rose|sky|sand)|#/);
    }
  });
});

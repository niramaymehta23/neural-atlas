import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { world1 } from "../src/catalog/world-1";
import { world3 } from "../src/catalog/world-3";

/**
 * Automated accessibility checks (A11Y-29): every kind of page, in day and night paper, at a
 * desktop width with normal motion and a 320px phone with reduced motion. WCAG 2.1 A and AA,
 * colour contrast included, so it catches A11Y-01..05 coming back.
 */
/** Every built World 1 and World 3 lesson besides the headline ones (stage 06). */
const WORLDS_1_AND_3 = [...world1.lessons, ...world3.lessons]
  .filter(({ load, id }) => load && id !== "rolling-downhill" && id !== "stacking-cells")
  .map(({ id }) => ({ path: `/learn/${id}`, ready: "[data-region=scene]" }));

const PAGES = [
  ...WORLDS_1_AND_3,
  { path: "/", ready: "h1" },
  { path: "/puzzle", ready: "[data-lesson], [role=status] p" },
  { path: "/learn/rolling-downhill", ready: "[data-region=scene]" },
  { path: "/learn/stacking-cells", ready: "[data-region=scene]" },
  { path: "/learn/who-is-looking-at-whom", ready: "[data-region=scene]" },
  { path: "/learn/scoring-every-move", ready: "[data-region=scene]" },
  { path: "/learn/the-pattern-torch", ready: "h1" },
  { path: "/learn/no-such-idea", ready: "h1" },
  { path: "/styleguide", ready: "h1" },
] as const;

const SETUPS = [
  { name: "1280 normal motion", width: 1280, height: 800, motion: "no-preference" },
  { name: "320 reduced motion", width: 320, height: 640, motion: "reduce" },
] as const;

async function setTheme(page: Page, theme: "ivory" | "night") {
  await page.addInitScript((value) => {
    try {
      localStorage.setItem("neural-atlas-theme", value);
    } catch {
      // Storage blocked: the default theme is checked instead.
    }
  }, theme);
}

for (const theme of ["ivory", "night"] as const) {
  for (const setup of SETUPS) {
    test.describe(`${theme}, ${setup.name}`, () => {
      for (const { path, ready } of PAGES) {
        test(`${path} has no accessibility violations`, async ({ page }) => {
          await page.setViewportSize({ width: setup.width, height: setup.height });
          await page.emulateMedia({ reducedMotion: setup.motion });
          await setTheme(page, theme);
          await page.goto(path);
          await expect(page.locator(ready).first()).toBeVisible({ timeout: 20_000 });
          expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
          // Let entrances settle so contrast is measured on the resting colours.
          await page.waitForTimeout(600);
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();
          const summary = results.violations.map(({ id, nodes }) => ({
            id,
            targets: nodes.slice(0, 5).map(({ target }) => target.join(" ")),
          }));
          expect(summary).toEqual([]);
        });
      }
    });
  }
}

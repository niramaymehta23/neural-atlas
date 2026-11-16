import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const PRIMITIVES = [
  "PaperCard",
  "Dial",
  "Slider",
  "Toggle",
  "SegmentedControl",
  "HoverNote",
  "StoryCaption",
  "TermTag",
  "MissionCard",
  "UnderTheHoodDrawer",
  "CommandPalette",
  "CompareSplit",
];

// Every token tokens.css defines, so a new token without a swatch fails here.
const css = readFileSync(join(process.cwd(), "src/design/tokens.css"), "utf8");
const theme = css.slice(css.indexOf("@theme inline {"));
const TOKENS = [
  ...theme.matchAll(/--((?:color|font|radius|shadow|ease)-[a-z-]+): (?!initial|transparent)/g),
].map(([, name]) => name ?? "");

/** A palette colour from tokens.css as the browser reports it, e.g. "rgb(250, 249, 245)". */
function paletteRgb(name: string): string {
  const hex = new RegExp(`--${name}: #([0-9a-f]{6});`).exec(css)?.[1] ?? "";
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

async function openStyleguide(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/styleguide");
  return errors;
}

const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("is cross-origin isolated", async ({ page }) => {
  await page.goto("/styleguide");
  expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
});

for (const night of [false, true]) {
  test(`shows every token, primitive and the robot in ${night ? "night" : "ivory"}`, async ({
    page,
  }) => {
    const errors = await openStyleguide(page);
    if (night) {
      await page.getByRole("radio", { name: "Night" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
      expect(await background(page)).toBe(paletteRgb("charcoal"));
    } else {
      expect(await background(page)).toBe(paletteRgb("ivory"));
    }

    expect(TOKENS.length).toBeGreaterThan(15);
    for (const token of TOKENS) {
      await expect(page.locator(`[data-token="${token}"]`).first()).toBeVisible();
    }
    for (const name of PRIMITIVES) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
    await expect(
      page.getByRole("img", { name: "Robot learner", exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/styleguide-${night ? "night" : "ivory"}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test("remembers night mode across a reload", async ({ page }) => {
  await page.goto("/styleguide");
  await page.getByRole("radio", { name: "Night" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await expect(page.getByRole("radio", { name: "Night" })).toHaveAttribute("aria-checked", "true");
});

test("primitives work from the keyboard", async ({ page }) => {
  await page.goto("/styleguide");

  const dial = page.getByRole("slider", { name: "How big a step" });
  await dial.focus();
  await page.keyboard.press("End");
  await expect(dial).toHaveAttribute("aria-valuetext", "a huge step");

  await page.getByRole("button", { name: "Peek under the hood" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Each step, the ball checks")).toBeVisible();

  await page.keyboard.press("ControlOrMeta+k");
  const search = page.getByRole("dialog", { name: "Find an idea" }).getByRole("combobox");
  await expect(search).toBeFocused();
  await search.fill("downhill");
  await page.keyboard.press("Enter");
  await expect(page.getByText("You picked “downhill”.")).toBeVisible();

  const divider = page.getByRole("separator", { name: "Compare a small step with a big step" });
  await divider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(divider).toHaveAttribute("aria-valuenow", "45");
});

test("nothing glows: every shadow is a neutral grey, never a colour", async ({ page }) => {
  await page.goto("/styleguide");
  const shadows = await page.evaluate(() =>
    [...document.querySelectorAll("*")].flatMap((element) => {
      const style = getComputedStyle(element);
      return [style.boxShadow, style.textShadow, style.filter].filter((value) => value !== "none");
    }),
  );
  expect(shadows.length).toBeGreaterThan(0); // the lifted-shadow swatch
  for (const shadow of shadows) {
    for (const [, r, g, b] of shadow.matchAll(/rgba?\((\d+), (\d+), (\d+)/g)) {
      const channels = [Number(r), Number(g), Number(b)];
      expect(Math.max(...channels) - Math.min(...channels), shadow).toBeLessThanOrEqual(12);
    }
  }
});

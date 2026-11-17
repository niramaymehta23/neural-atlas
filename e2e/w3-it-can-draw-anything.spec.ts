import { expect, test, type Page } from "@playwright/test";
import { runEnded } from "./runs";
import { watch } from "./watch";

/** It can draw anything. Wording comes from src/modules/w3-neural-networks/it-can-draw-anything/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/it-can-draw-anything");
  await expect(page.getByTestId("it-can-draw-anything")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and the squiggle can be redrawn from the keyboard", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/Draw any squiggle you like/)).toBeVisible();
  await expect(page.getByText("Universal approximation", { exact: true })).toHaveCount(0);
  const squiggle = page.getByRole("slider", { name: "Your squiggle" });
  await squiggle.focus();
  const before = await squiggle.getAttribute("aria-valuenow");
  await page.keyboard.press("ArrowUp");
  await expect(squiggle).not.toHaveAttribute("aria-valuenow", before!);
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(page.locator("[data-cells-line]")).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("too few cells can't follow a bumpy squiggle, and earn the star", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How many cells" }).focus();
  await page.keyboard.press("Home");
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
});

test("a link opens on the same squiggle", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("button", { name: "A zigzag" }).click();
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await runEnded(page);
  const said = await page.locator("[data-how-close]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/it-can-draw-anything${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("button", { name: "A zigzag" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(fresh.locator("[data-how-close]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

test.describe("on a touch phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("the drawing fits the width and leaves a swipe to scroll", async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
    await expect(page.locator("[data-drawing]")).toHaveCSS("touch-action", "manipulation");
  });
});

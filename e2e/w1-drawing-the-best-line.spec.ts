import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Drawing the best line. Wording comes from src/modules/w1-foundations/drawing-the-best-line/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");
const field = (page: Page) =>
  page.getByRole("application", { name: "Dots: tap or drag to add your own" });

async function open(page: Page) {
  await page.goto("/learn/drawing-the-best-line");
  await expect(page.getByTestId("drawing-the-best-line")).toBeVisible({ timeout: 20_000 });
}

/** Adds one dot far below the line at the right-hand end, from the keyboard. */
async function addCrazyDot(page: Page) {
  await field(page).focus();
  for (let step = 0; step < 18; step += 1) {
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
}

test("an end of the line moves and the misses change", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText("Linear regression", { exact: true })).toHaveCount(0);
  const before = await page.locator("[data-total-miss]").getAttribute("data-total-miss");
  const left = page.getByRole("slider", { name: "Left end of the line" });
  await left.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("[data-total-miss]")).not.toHaveAttribute("data-total-miss", before!);
  expect(errors).toEqual([]);
});

test("one crazy dot tilts the best line", async ({ page }) => {
  await open(page);
  await addCrazyDot(page);
  await dock(page).getByRole("button", { name: "Let it find the best line" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Linear regression", { exact: true })).toBeVisible();
});

test("a link opens on the same best line", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await dock(page).getByRole("button", { name: "Let it find the best line" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 10_000 });
  const line = await page.locator("[data-line]").getAttribute("data-line");
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/drawing-the-best-line${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-line]")).toHaveAttribute("data-line", line!, {
    timeout: 15_000,
  });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

test.describe("on a touch phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("the lesson fits the width", async ({ page }) => {
    await open(page);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(wide).toBeLessThanOrEqual(375);
  });
});

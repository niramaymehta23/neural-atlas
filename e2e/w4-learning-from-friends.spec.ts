import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Learning from friends. Wording comes from src/modules/w4-deep-architectures/learning-from-friends/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/learning-from-friends");
  await expect(page.getByTestId("learning-from-friends")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and a round of messages spreads the clubs", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/Sixteen friends belong to two clubs/)).toBeVisible();
  await expect(page.getByText("Graph neural network", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-lean=none]")).toHaveCount(12);
  await dock(page).getByRole("button", { name: "Pass messages once" }).click();
  await expect(page.locator("[data-right]")).toContainText("friends without a badge think");
  await expect(page.locator("[data-lean=none]")).not.toHaveCount(12);
  expect(errors).toEqual([]);
});

test("many rounds make everyone identical, and earn the star", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How many rounds" }).focus();
  await page.keyboard.press("End");
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-same]")).toBeVisible();
});

test("a tap on a button works with touch, and reduced motion sends no pulses", async ({
  browser,
}) => {
  const context = await browser.newContext({ hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await open(page);
  await dock(page).getByRole("button", { name: "Pass messages once" }).tap();
  await expect(page.getByTestId("learning-from-friends")).toHaveAttribute("data-rounds", "1");
  await expect(page.locator("[data-pulse]")).toHaveCount(0);
  await context.close();
});

test("a link opens on the same network", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("slider", { name: "How many rounds" }).focus();
  for (let press = 0; press < 5; press += 1) await page.keyboard.press("ArrowUp");
  const said = await page.locator("[data-right]").textContent();
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/learning-from-friends${new URL(page.url()).hash}`);
  await expect(fresh.getByTestId("learning-from-friends")).toHaveAttribute("data-rounds", "5");
  await expect(fresh.locator("[data-right]")).toHaveText(said!);
});

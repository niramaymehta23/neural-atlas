import { expect, test, type Page } from "@playwright/test";
import { runEnded } from "./runs";
import { watch } from "./watch";

/** Meaning as places. Wording comes from src/modules/w4-deep-architectures/meaning-as-places/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/meaning-as-places");
  await expect(page.getByTestId("meaning-as-places")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and drawing the map gathers words by kind", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/Can a computer work out what words mean/)).toBeVisible();
  await expect(page.getByText("Word embeddings", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Draw the map" }).click();
  await runEnded(page, 20_000);
  await expect(page.locator("[data-word=cat]")).toBeVisible();
  await expect(page.locator("[data-map]")).toContainText("sit nearest to a word of the same kind");
  expect(errors).toEqual([]);
});

test("with no pushing apart, every word squashes into one spot and earns the star", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("slider", { name: "How hard different words push apart" }).focus();
  await page.keyboard.press("Home");
  await dock(page).getByRole("button", { name: "Draw the map" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-squashed]")).toBeVisible();
});

test("works by touch at phone width", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 700 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await open(page);
  await dock(page).getByRole("button", { name: "Draw the map" }).tap();
  await runEnded(page, 20_000);
  await expect(page.locator("[data-word=bus]")).toBeVisible();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(wide).toBeLessThanOrEqual(320);
  await context.close();
});

test("a link opens on the same map", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("slider", { name: "How big a step" }).focus();
  await page.keyboard.press("ArrowUp");
  await dock(page).getByRole("button", { name: "Draw the map" }).click();
  await runEnded(page, 20_000);
  const said = await page.locator("[data-map]").textContent();
  const where = await page.locator("[data-word=cat] path").getAttribute("d");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/meaning-as-places${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-map]")).toHaveText(said!, { timeout: 20_000 });
  await expect(fresh.locator("[data-word=cat] path")).toHaveAttribute("d", where!);
});

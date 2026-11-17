import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Stubborn vs jumpy. Wording comes from src/modules/w1-foundations/stubborn-vs-jumpy/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page, hash = "") {
  await page.goto(`/learn/stubborn-vs-jumpy${hash}`);
  await expect(page.getByTestId("stubborn-vs-jumpy")).toBeVisible({ timeout: 20_000 });
}

test("opens on the story, and a fresh throw lands twelve darts", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/Twelve little robots/).first()).toBeVisible();
  await expect(page.getByText("Bias and variance", { exact: true })).toHaveCount(0);
  const darts = page.locator("[data-dart]");
  await expect(darts).toHaveCount(12);
  await dock(page).getByRole("button", { name: "Throw again" }).click();
  await expect(darts).toHaveCount(12);
  await expect(page.locator("[data-board-words]")).not.toBeEmpty();
  expect(errors).toEqual([]);
});

test("very bendy robots with few examples scatter darts everywhere", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await page.getByRole("slider", { name: "How bendy each robot is" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("slider", { name: "How many examples each robot sees" }).focus();
  await page.keyboard.press("Home");
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("a link opens on the same board", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("slider", { name: "How bendy each robot is" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Throw again" }).click();
  const said = await page.locator("[data-board-words]").textContent();
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await open(fresh, new URL(page.url()).hash);
  await expect(fresh.locator("[data-board-words]")).toHaveText(said!);
});

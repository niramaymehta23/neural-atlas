import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Keeping things steady. Wording comes from src/modules/w3-neural-networks/keeping-things-steady/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/keeping-things-steady");
  await expect(page.getByTestId("keeping-things-steady")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and something happens once it runs", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/Stack layer after layer of brain cells/)).toBeVisible();
  await expect(page.getByText("Normalisation", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Practise", exact: true }).click();
  await expect(page.locator("[data-outcome]")).toHaveText(/It learned|slowly/, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("earns the star", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How many layers" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Practise", exact: true }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
});

test("a link opens on the same view", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("switch", { name: "Keep signals calm" }).click();
  await dock(page).getByRole("button", { name: "Practise", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 15_000 });
  const said = await page.locator("[data-outcome]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/keeping-things-steady${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-outcome]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

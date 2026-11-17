import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Where you start. Wording comes from src/modules/w3-neural-networks/where-you-start/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/where-you-start");
  await expect(page.getByTestId("where-you-start")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and something happens once it runs", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(
    page.getByText(/Spin the wheel to give the team new starting guesses/),
  ).toBeVisible();
  await expect(page.getByText("Initialisation", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Spin", exact: true }).click();
  await expect(page.locator("[data-score]")).toHaveText(/This spin sorts/, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("earns the star", async ({ page }) => {
  await open(page);
  await page.getByRole("switch", { name: "Start every cell the same" }).click();
  await dock(page).getByRole("button", { name: "Spin", exact: true }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
});

test("a link opens on the same view", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("slider", { name: "How many cells" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Spin", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 15_000 });
  const said = await page.locator("[data-score]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/where-you-start${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-score]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

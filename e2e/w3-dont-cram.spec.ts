import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Don’t cram. Wording comes from src/modules/w3-neural-networks/dont-cram/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/dont-cram");
  await expect(page.getByTestId("dont-cram")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and something happens once it runs", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(
    page.getByText(/A big team of brain cells practises on a few messy dots/),
  ).toBeVisible();
  await expect(page.getByText("Regularisation and dropout", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Practise", exact: true }).click();
  await expect(page.locator("[data-scores]")).toHaveText(/New dots/, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("earns the star", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How many cells switch off while it learns" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Practise", exact: true }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
});

test("a link opens on the same view", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("slider", { name: "How big the team is" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Practise", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 15_000 });
  const said = await page.locator("[data-scores]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/dont-cram${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-scores]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

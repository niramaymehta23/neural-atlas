import { expect, test, type Page } from "@playwright/test";
import { runEnded } from "./runs";
import { watch } from "./watch";

/** Big steps, then small. Wording comes from src/modules/w3-neural-networks/big-steps-then-small/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/big-steps-then-small");
  await expect(page.getByTestId("big-steps-then-small")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and something happens once it runs", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/A ball has to walk down to the bottom of a valley/)).toBeVisible();
  await expect(page.getByText("Learning-rate schedule", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Let it roll" }).click();
  await expect(page.locator("[data-ending]")).toHaveText(/settled/, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("earns the star", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How careful to finish" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Let it roll" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
});

test("a link opens on the same view", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("slider", { name: "How bold to start" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Let it roll" }).click();
  await runEnded(page);
  const said = await page.locator("[data-ending]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/big-steps-then-small${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-ending]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

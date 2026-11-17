import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** The decision curve. Wording comes from src/modules/w3-neural-networks/the-decision-curve/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/the-decision-curve");
  await expect(page.getByTestId("the-decision-curve")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and the cells draw a line once they practise", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/wants to copy a wavy line/)).toBeVisible();
  await expect(page.getByText("Activation function", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(page.locator("[data-curve]")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-how-close]")).not.toContainText("Let it practise", {
    timeout: 15_000,
  });
  expect(errors).toEqual([]);
});

test("huge steps send cut-off cells silent forever, and earn the star", async ({ page }) => {
  await open(page);
  await page.getByRole("radio", { name: "Cut-off", exact: true }).click();
  await page.getByRole("slider", { name: "How big a step" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-silent]")).toBeVisible();
});

test("a link opens on the same curve", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("radio", { name: "A hill" }).click();
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 15_000 });
  const said = await page.locator("[data-how-close]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/the-decision-curve${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("radio", { name: "A hill" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(fresh.locator("[data-how-close]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

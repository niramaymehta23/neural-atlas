import { expect, test, type Page } from "@playwright/test";
import { runEnded } from "./runs";
import { watch } from "./watch";

/** Passing back the blame. Wording comes from src/modules/w3-neural-networks/passing-back-the-blame/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/passing-back-the-blame");
  await expect(page.getByTestId("passing-back-the-blame")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and blame rain falls once it practises", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/passing a message from one end to the other/)).toBeVisible();
  await expect(page.getByText("Backpropagation", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(page.locator("[data-gradient-rain]")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-reach]")).not.toBeEmpty({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("in a deep stack the rain dries up before the start, and earns the star", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How many layers" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
});

test("a link opens on the same rain", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("radio", { name: "Leaky cut-off" }).click();
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await runEnded(page);
  const said = await page.locator("[data-reach]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/passing-back-the-blame${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("radio", { name: "Leaky cut-off" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(fresh.locator("[data-reach]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

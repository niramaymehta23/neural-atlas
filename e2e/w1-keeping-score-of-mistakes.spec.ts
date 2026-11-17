import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Keeping score of mistakes. Wording comes from src/modules/w1-foundations/keeping-score-of-mistakes/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/keeping-score-of-mistakes");
  await expect(page.getByTestId("keeping-score-of-mistakes")).toBeVisible({ timeout: 20_000 });
}

test("the line learns under a strict scorer", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText("Loss function", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Let the line learn" }).click();
  await expect(page.locator("[data-stage]")).toHaveAttribute("data-stage", "done", {
    timeout: 15_000,
  });
  expect(errors).toEqual([]);
});

test("a gentle scorer lets the line ignore the rare group", async ({ page }) => {
  await open(page);
  const strict = dock(page).getByRole("slider", { name: "How strict the scorer is" });
  await strict.focus();
  await page.keyboard.press("Home");
  await dock(page).getByRole("button", { name: "Let the line learn" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Loss function", { exact: true })).toBeVisible();
});

test("a link opens on the same line", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await dock(page).getByRole("button", { name: "Let the line learn" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 10_000 });
  const line = await page.locator("[data-line]").getAttribute("data-line");
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/keeping-score-of-mistakes${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-line]")).toHaveAttribute("data-line", line!, {
    timeout: 15_000,
  });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

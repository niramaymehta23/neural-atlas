import { expect, test, type Page } from "@playwright/test";
import { runEnded } from "./runs";
import { watch } from "./watch";

/** Forger vs detective. Wording comes from src/modules/w4-deep-architectures/forger-vs-detective/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/forger-vs-detective");
  await expect(page.getByTestId("forger-vs-detective")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and the duel fills the scoreboard", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/A forger wants to draw faces/)).toBeVisible();
  await expect(page.getByText("GAN", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Start the duel" }).click();
  await expect(page.locator("[data-fake]").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-score]")).toContainText("The detective was right");
  expect(errors).toEqual([]);
});

test("a rushing forger with many tries draws one face, and earns the star", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How fast the forger learns" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("slider", { name: "Forger tries per detective look" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Start the duel" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 40_000 });
  await expect(page.locator("[data-bunched]")).toBeVisible();
});

test("a link opens on the same duel", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("slider", { name: "Forger tries per detective look" }).focus();
  await page.keyboard.press("ArrowUp");
  await dock(page).getByRole("button", { name: "Start the duel" }).click();
  await runEnded(page, 40_000);
  const said = await page.locator("[data-score]").textContent();
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/forger-vs-detective${new URL(page.url()).hash}`);
  await expect(
    fresh.getByRole("slider", { name: "Forger tries per detective look" }),
  ).toHaveAttribute("aria-valuenow", "2");
  await expect(fresh.locator("[data-score]")).toHaveText(said!, { timeout: 40_000 });
});

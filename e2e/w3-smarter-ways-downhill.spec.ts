import { expect, test, type Page } from "@playwright/test";
import { runEnded } from "./runs";
import { watch } from "./watch";

/** Smarter ways downhill. Wording comes from src/modules/w3-neural-networks/smarter-ways-downhill/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/smarter-ways-downhill");
  await expect(page.getByTestId("smarter-ways-downhill")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and something happens once it runs", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/Three walkers race down a foggy valley/)).toBeVisible();
  await expect(page.getByText("Optimisers", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Race them" }).click();
  await expect(page.locator("[data-race-result]")).not.toBeEmpty({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("earns the star", async ({ page }) => {
  await open(page);
  await page.getByRole("radio", { name: "Mountain pass" }).click();
  await page.getByRole("slider", { name: "How big a step" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Race them" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
});

test("a link opens on the same view", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("radio", { name: "Mountain pass" }).click();
  await dock(page).getByRole("button", { name: "Race them" }).click();
  await runEnded(page);
  const said = await page.locator("[data-race-result]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/smarter-ways-downhill${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-race-result]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

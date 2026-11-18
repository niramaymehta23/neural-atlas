import { expect, test, type Page } from "@playwright/test";
import { runEnded } from "./runs";
import { watch } from "./watch";

/**
 * Reading one word at a time. Wording comes from
 * src/modules/w4-deep-architectures/reading-one-word-at-a-time/captions.ts.
 */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/reading-one-word-at-a-time");
  await expect(page.getByTestId("reading-one-word-at-a-time")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and the reader answers once it has practised", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/carrying a little memory bead/)).toBeVisible();
  await expect(page.getByText("RNN", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(page.locator("[data-memory=remembers]")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-answer]")).toContainText("At the end it says");
  expect(errors).toEqual([]);
});

test("a long sentence makes it forget the start, and earns the star", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How long the sentence is" }).focus();
  await page.keyboard.press("End");
  await expect(page.locator("[data-word]")).toHaveCount(20);
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-memory=guessing]")).toBeVisible();
});

test("a link opens on the same sentence and the same moment", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("radio", { name: "Rainy" }).click();
  await page.getByRole("slider", { name: "How long the sentence is" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await runEnded(page);
  const said = await page.locator("[data-answer]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/reading-one-word-at-a-time${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("radio", { name: "Rainy" })).toHaveAttribute("aria-checked", "true");
  await expect(fresh.locator("[data-word]")).toHaveCount(8);
  await expect(fresh.locator("[data-answer]")).toHaveText(said!, { timeout: 20_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

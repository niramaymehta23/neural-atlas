import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** One tiny brain cell. Wording comes from src/modules/w3-neural-networks/one-tiny-brain-cell/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/one-tiny-brain-cell");
  await expect(page.getByTestId("one-tiny-brain-cell")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and a voice can be switched off", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/deciding whether to go to the park/)).toBeVisible();
  await expect(page.getByText("Neuron", { exact: true })).toHaveCount(0);
  const sun = page.locator("[data-voice='0']");
  await expect(sun).toHaveAttribute("aria-pressed", "true");
  await sun.click();
  await expect(sun).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("[data-cell-says]")).toContainText("The cell says:");
  expect(errors).toEqual([]);
});

test("a cell too hard to convince never says yes, and earns the star", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How hard it is to convince" }).focus();
  await page.keyboard.press("End");
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Neuron", { exact: true })).toBeVisible();
});

test("a link opens on the same cell", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.locator("[data-voice='2']").click();
  const firmly = page.getByRole("slider", { name: "How firmly it decides" });
  await firmly.focus();
  await page.keyboard.press("End");
  const said = await page.locator("[data-cell-says]").textContent();
  const dial = await firmly.getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/one-tiny-brain-cell${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-cell-says]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.locator("[data-voice='2']")).toHaveAttribute("aria-pressed", "true");
  await expect(fresh.getByRole("slider", { name: "How firmly it decides" })).toHaveAttribute(
    "aria-valuetext",
    dial!,
  );
});

import { expect, test, type Page } from "@playwright/test";
import { GPU } from "./gpu";
import { watch } from "./watch";

/** Zooming out. Wording comes from src/modules/w4-deep-architectures/zooming-out/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");
const scene = (page: Page) => page.getByTestId("zooming-out");
const shrink = (page: Page) => page.getByRole("slider", { name: "How much to shrink" });

async function open(page: Page, hash = "") {
  await page.goto(`/learn/zooming-out${hash}`);
  await expect(scene(page)).toBeVisible({ timeout: 20_000 });
  await expect(scene(page)).toHaveAttribute("data-ladder", "8", { timeout: 60_000 });
}
test.describe("Zooming out", { tag: GPU }, () => {
  test("the AI loses track as the photo shrinks; the last step it knows earns the star", async ({
    page,
  }) => {
    const { errors, elsewhere } = watch(page);
    await open(page);
    await expect(page.getByText("Pooling", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-answer]")).toHaveText("The AI says: boxer.");
    await dock(page).getByRole("button", { name: "Skip the guess for now" }).click();
    const lastKnown = Number(await scene(page).getAttribute("data-last-known"));
    expect(lastKnown).toBeGreaterThan(0);
    await shrink(page).focus();
    await page.keyboard.press("End");
    await expect(page.locator("[data-answer]")).toHaveText(/For the full photo it said boxer\./, {
      timeout: 60_000,
    });
    await page.keyboard.press("Home");
    for (let step = 0; step < lastKnown; step += 1) await page.keyboard.press("ArrowRight");
    await expect(dock(page).getByText("You earned a star.")).toBeVisible();
    expect(errors).toEqual([]);
    expect(elsewhere).toEqual([]);
  });

  test("shrinking to a few blocks answers the guess", async ({ page }) => {
    await open(page);
    await dock(page).getByRole("button", { name: "No, it loses track" }).click();
    await shrink(page).focus();
    for (let step = 0; step < 5; step += 1) await page.keyboard.press("ArrowRight");
    await dock(page).getByRole("button", { name: "Show me what happens" }).click();
    await expect(dock(page).getByText("Spot on.")).toBeVisible();
  });

  test("a link opens on the same photo, shrink and way of keeping", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page);
    await page.getByRole("radio", { name: "Teapot" }).click();
    await page.getByRole("radio", { name: "The brightest" }).click();
    await shrink(page).focus();
    for (let step = 0; step < 3; step += 1) await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "Copy a link to this view" }).click();
    await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

    const fresh = await context.newPage();
    await fresh.goto(`/learn/zooming-out${new URL(page.url()).hash}`);
    await expect(fresh.getByRole("radio", { name: "The brightest" })).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 20_000 },
    );
    await expect(fresh.getByRole("radio", { name: "Teapot" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(fresh.getByRole("slider", { name: "How much to shrink" })).toHaveAttribute(
      "aria-valuenow",
      "3",
    );
  });

  test("says plainly when the photo cannot be fetched, and tries again", async ({ page }) => {
    await page.route("**/models/photos-v1/dog.jpg", (route) => route.abort());
    await page.goto("/learn/zooming-out");
    await expect(page.getByText("The photo would not load.")).toBeVisible({ timeout: 20_000 });
    await page.unroute("**/models/photos-v1/dog.jpg");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(scene(page)).toHaveAttribute("data-ladder", "8", { timeout: 60_000 });
  });
});

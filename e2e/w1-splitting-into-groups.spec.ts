import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Splitting into groups. Wording comes from src/modules/w1-foundations/splitting-into-groups/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/splitting-into-groups");
  await expect(page.getByTestId("splitting-into-groups")).toBeVisible({ timeout: 20_000 });
}

test("a fence goes up and says how many flowers it gets right", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText("Classification", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Put up a fence" }).click();
  await expect(page.locator("[data-right-side]")).toContainText("on the right side");
  await expect(page.locator("[data-fence]")).toBeVisible();
  expect(errors).toEqual([]);
});

test("tulips round the daisies leave no straight fence that works", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Tulips round daisies" }).click();
  await dock(page).getByRole("button", { name: "Put up a fence" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Classification", { exact: true })).toBeVisible();
});

test("the magnifying glass moves with the keyboard and reads out what it sees", async ({
  page,
}) => {
  await open(page);
  await dock(page).getByRole("button", { name: "Put up a fence" }).click();
  const lens = page.getByRole("application", { name: "Magnifying glass" });
  const before = await lens.getAttribute("data-lens");
  await lens.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(lens).not.toHaveAttribute("data-lens", before!);
  await expect(page.getByText(/Inside the glass/)).toBeVisible();
});

test("a link opens on the same fence", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("button", { name: "Two patches, mixed at the edge" }).click();
  await dock(page).getByRole("button", { name: "Put up a fence" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 10_000 });
  const said = await page.locator("[data-right-side]").textContent();
  const moment = await page.getByRole("slider", { name: "Moment" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/splitting-into-groups${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-right-side]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    moment!,
  );
});

test.describe("on a touch phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("the lesson fits the width and the field does not trap scrolling", async ({ page }) => {
    await open(page);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(wide).toBeLessThanOrEqual(375);
    const field = page.getByRole("application", { name: /Field/ });
    await expect(field).toHaveCSS("touch-action", "pan-y");
  });
});

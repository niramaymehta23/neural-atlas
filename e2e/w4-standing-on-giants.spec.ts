import { expect, test, type Page } from "@playwright/test";
import { FAKE_CAMERA, reads, refuseCamera } from "./camera";
import { watch } from "./watch";

/** Standing on giants. Wording comes from src/modules/w4-deep-architectures/standing-on-giants/captions.ts. */
test.use(FAKE_CAMERA);

const dock = (page: Page) => page.locator("[data-region=dock]");
const score = (page: Page) => page.locator("[data-score]");
const teach = (page: Page) =>
  page.getByRole("slider", { name: "How many photos of each to teach with" });

async function open(page: Page, hash = "") {
  await page.goto(`/learn/standing-on-giants${hash}`);
  await expect(page.getByTestId("standing-on-giants")).toBeVisible({ timeout: 20_000 });
  await expect(score(page)).not.toHaveAttribute("data-score", "", { timeout: 90_000 });
}

test("with the big AI's know-how, one photo of each is enough for the star", async ({ page }) => {
  const { errors, elsewhere } = watch(page);
  await open(page);
  await expect(page.getByText("Transfer learning", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Starting from the big AI" }).click();
  await page.getByRole("radio", { name: "The big AI's know-how" }).click();
  await teach(page).focus();
  await page.keyboard.press("Home");
  await expect(dock(page).getByText("You earned a star.")).toBeVisible();
  await dock(page).getByRole("button", { name: "Show me what happens" }).click();
  await expect(dock(page).getByText("Spot on.")).toBeVisible();
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("teaches its own groups from camera snaps", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Teach it with my camera" }).click();
  await expect(
    page.getByText("They are never sent anywhere or saved", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Yes, use my camera" }).click();
  await expect.poll(() => reads(page), { timeout: 60_000 }).toBeGreaterThan(1);
  await expect(
    page.getByText("Snap at least one picture for each group", { exact: false }),
  ).toBeVisible();
  for (const group of [1, 2, 3]) {
    await page.getByRole("button", { name: `Snap for group ${group}` }).click();
  }
  await expect(page.getByText(/^It thinks this is group [123]\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Stop the camera" }).click();
  await expect(page.getByText(/^It thinks this is group/)).toHaveCount(0);
});

test("a refused camera leaves the photos working", async ({ page }) => {
  await refuseCamera(page);
  await open(page);
  await page.getByRole("button", { name: "Teach it with my camera" }).click();
  await page.getByRole("button", { name: "Yes, use my camera" }).click();
  await expect(
    page.getByText("The camera is blocked, so teach with the photos instead."),
  ).toBeVisible();
  await expect(score(page)).toHaveText(/new photos right/);
});

test("a link opens on the same start and number of photos", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("radio", { name: "The big AI's know-how" }).click();
  await teach(page).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  const said = await score(page).textContent();
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/standing-on-giants${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("radio", { name: "The big AI's know-how" })).toHaveAttribute(
    "aria-checked",
    "true",
    { timeout: 20_000 },
  );
  await expect(
    fresh.getByRole("slider", { name: "How many photos of each to teach with" }),
  ).toHaveAttribute("aria-valuenow", "3");
  await expect(fresh.locator("[data-score]")).toHaveText(said ?? "", { timeout: 90_000 });
});

test("says plainly when the photos cannot be fetched, and tries again", async ({ page }) => {
  await page.route("**/models/photos-v1/flowers-8.jpg", (route) => route.abort());
  await page.goto("/learn/standing-on-giants");
  await expect(page.getByText("The photos or the big AI would not load.")).toBeVisible({
    timeout: 90_000,
  });
  await page.unroute("**/models/photos-v1/flowers-8.jpg");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(score(page)).toHaveText(/new photos right/, { timeout: 90_000 });
});

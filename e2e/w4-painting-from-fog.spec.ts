import { expect, test, type Page } from "@playwright/test";
import { runEnded } from "./runs";
import { watch } from "./watch";

/** Painting from fog. Wording comes from src/modules/w4-deep-architectures/painting-from-fog/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");
const verdict = (page: Page) => page.locator("[data-verdict]");
const picture = (page: Page) => page.getByRole("group", { name: /^The picture in the fog/ });

async function open(page: Page) {
  await page.goto("/learn/painting-from-fog");
  await expect(page.getByTestId("painting-from-fog")).toBeVisible({ timeout: 20_000 });
  await expect(picture(page)).toBeVisible({ timeout: 20_000 });
}

test("clears the fog into a face, and one giant step gives mush for the star", async ({ page }) => {
  const { errors, elsewhere } = watch(page);
  await open(page);
  await expect(page.getByText("Diffusion", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Skip the guess for now" }).click();
  await dock(page).getByRole("button", { name: "Clear the fog" }).click();
  await runEnded(page);
  await expect(verdict(page)).toHaveAttribute("data-verdict", "face");
  await page.getByRole("slider", { name: "How many cleaning steps" }).focus();
  await page.keyboard.press("Home");
  await expect(verdict(page)).toHaveAttribute("data-verdict", "mush", { timeout: 20_000 });
  await expect(dock(page).getByText("You earned a star.")).toBeVisible();
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("the moment slider scrubs from fog back to the picture", async ({ page }) => {
  await open(page);
  await dock(page).getByRole("button", { name: "Skip the guess for now" }).click();
  await dock(page).getByRole("button", { name: "Clear the fog" }).click();
  await runEnded(page);
  await page.getByRole("slider", { name: "Moment" }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByTestId("painting-from-fog")).toHaveAttribute("data-epoch", "0");
});

test("paint steers the face, and a link replays the same painting", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await dock(page).getByRole("button", { name: "Skip the guess for now" }).click();
  const box = await picture(page).boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.2, { steps: 8 });
  await page.mouse.up();
  await expect(picture(page)).not.toHaveAttribute("data-painted", "0");
  await dock(page).getByRole("button", { name: "Clear the fog" }).click();
  await runEnded(page);
  const painted = await picture(page).getAttribute("data-painted");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/painting-from-fog${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("group", { name: /^The picture in the fog/ })).toHaveAttribute(
    "data-painted",
    painted!,
    { timeout: 20_000 },
  );
  await expect(fresh.locator("[data-verdict]")).toHaveAttribute("data-verdict", "face", {
    timeout: 20_000,
  });
});

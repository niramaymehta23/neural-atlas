import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Squeeze and rebuild. Wording comes from src/modules/w4-deep-architectures/squeeze-and-rebuild/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");
const closeness = (page: Page) => page.locator("[data-closeness]");

async function open(page: Page, hash = "") {
  await page.goto(`/learn/squeeze-and-rebuild${hash}`);
  await expect(page.getByTestId("squeeze-and-rebuild")).toBeVisible({ timeout: 20_000 });
  await expect(closeness(page)).toBeVisible({ timeout: 20_000 });
}

test("rebuilds the face, and blurs it when squeezed to one number for the star", async ({
  page,
}) => {
  const { errors, elsewhere } = watch(page);
  await open(page);
  await expect(page.getByText("Autoencoder", { exact: true })).toHaveCount(0);
  await expect(closeness(page)).toHaveAttribute("data-closeness", "almost");
  await dock(page).getByRole("button", { name: "Skip the guess for now" }).click();
  await page.getByRole("slider", { name: "How many numbers it keeps" }).focus();
  await page.keyboard.press("Home");
  await expect(closeness(page)).toHaveAttribute("data-closeness", "blurry");
  await expect(dock(page).getByText("You earned a star.")).toBeVisible();
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("speckles do not survive the squeeze, which answers the guess", async ({ page }) => {
  await open(page);
  await dock(page).getByRole("button", { name: "No, it comes back clean" }).click();
  await page.getByRole("slider", { name: "How speckled the picture is" }).focus();
  await page.keyboard.press("End");
  await expect(page.locator("[data-speckles-gone]")).toBeVisible();
  await dock(page).getByRole("button", { name: "Show me what happens" }).click();
  await expect(dock(page).getByText("Spot on.")).toBeVisible();
});

test("a tap picks another face, and a link opens on the same squeeze", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("radio", { name: "Face 5" }).click();
  await page.getByRole("slider", { name: "How many numbers it keeps" }).focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  const said = await closeness(page).getAttribute("data-closeness");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/squeeze-and-rebuild${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("radio", { name: "Face 5" })).toHaveAttribute(
    "aria-checked",
    "true",
    {
      timeout: 20_000,
    },
  );
  await expect(fresh.getByRole("slider", { name: "How many numbers it keeps" })).toHaveAttribute(
    "aria-valuenow",
    "3",
  );
  await expect(fresh.locator("[data-closeness]")).toHaveAttribute("data-closeness", said!);
});

test("says plainly when the squeezer cannot be fetched", async ({ page }) => {
  await page.route("**/models/faces-v1/squeeze.bin", (route) => route.abort());
  await page.goto("/learn/squeeze-and-rebuild");
  await expect(page.getByText("The squeezer couldn’t be fetched.", { exact: false })).toBeVisible({
    timeout: 20_000,
  });
  await page.unroute("**/models/faces-v1/squeeze.bin");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("[data-closeness]")).toBeVisible({ timeout: 20_000 });
});

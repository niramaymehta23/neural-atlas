import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** What the machine sees. Wording comes from src/modules/w1-foundations/what-the-machine-sees/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/what-the-machine-sees");
  await expect(page.getByTestId("what-the-machine-sees")).toBeVisible({ timeout: 20_000 });
}

test("hiding a fact changes the price guesses", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText("Features", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Door colour: told" }).click();
  await expect(page.getByRole("button", { name: "Door colour: hidden" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator("[data-overall]")).toBeVisible();
  expect(errors).toEqual([]);
});

test("hiding size sends the guesses far off", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Size: told" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-overall]")).toHaveAttribute("data-overall", "far");
  await expect(page.getByText("Features", { exact: true })).toBeVisible();
});

test("a link opens on the same facts", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("button", { name: "Garden: told" }).click();
  const said = await page.locator("[data-overall]").textContent();
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/what-the-machine-sees${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("button", { name: "Garden: hidden" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(fresh.locator("[data-overall]")).toHaveText(said!);
});

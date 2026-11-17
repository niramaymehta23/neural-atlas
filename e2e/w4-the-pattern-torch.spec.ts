import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** The pattern torch. Wording comes from src/modules/w4-deep-architectures/the-pattern-torch/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");
const found = (page: Page) => page.locator("[data-found]");
const square = (page: Page, place: string, wants: string) =>
  page.getByRole("button", { name: `${place}: wants ${wants}` });

async function open(page: Page, hash = "") {
  await page.goto(`/learn/the-pattern-torch${hash}`);
  await expect(page.getByTestId("the-pattern-torch")).toBeVisible({ timeout: 20_000 });
  await expect(found(page)).toHaveText("Sweep the torch to fill in the finding map.", {
    timeout: 20_000,
  });
}

test("the edge torch lights up along edges, which answers the guess", async ({ page }) => {
  const { errors, elsewhere } = watch(page);
  await open(page);
  await expect(page.getByText("Convolution", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Along edges, where dark meets light" }).click();
  await page.getByRole("button", { name: "Sweep it" }).click();
  await expect(found(page)).toHaveText(/found its pattern/);
  await dock(page).getByRole("button", { name: "Show me what happens" }).click();
  await expect(dock(page).getByText("Spot on.")).toBeVisible();
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("a torch of light and dark taking turns finds nothing, for the star", async ({ page }) => {
  await open(page);
  await dock(page).getByRole("button", { name: "Skip the guess for now" }).click();
  await page.getByRole("radio", { name: "Empty torch" }).click();
  // Light in the corners and the centre, dark on the edges: a tap makes light, two make dark.
  for (const place of ["Top left", "Top right", "Centre", "Bottom left", "Bottom right"]) {
    await square(page, place, "anything").click();
  }
  for (const place of ["Top middle", "Middle left", "Middle right", "Bottom middle"]) {
    await square(page, place, "anything").click();
    await square(page, place, "light").click();
  }
  await page.getByRole("button", { name: "Sweep it" }).click();
  await expect(found(page)).toHaveText("The torch found nothing anywhere.");
  await expect(dock(page).getByText("You earned a star.")).toBeVisible();
  await expect(page.getByText("Your own network can now carry a pattern torch too.")).toBeVisible();
});

test("a link opens on the same torch, photo and sweep", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("radio", { name: "Teapot" }).click();
  await page.getByRole("radio", { name: "A bright spot" }).click();
  await page.getByRole("button", { name: "Sweep it" }).click();
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/the-pattern-torch${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("radio", { name: "Teapot" })).toHaveAttribute(
    "aria-checked",
    "true",
    { timeout: 20_000 },
  );
  await expect(fresh.getByRole("radio", { name: "A bright spot" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(fresh.getByTestId("the-pattern-torch")).toHaveAttribute(
    "data-key",
    (await page.getByTestId("the-pattern-torch").getAttribute("data-key")) ?? "",
  );
  await expect(fresh.getByRole("slider", { name: "How far the torch has swept" })).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
});

test("says plainly when the photo cannot be fetched, and tries again", async ({ page }) => {
  await page.route("**/models/photos-v1/cat.jpg", (route) => route.abort());
  await page.goto("/learn/the-pattern-torch");
  await expect(page.getByText("The photo would not load.")).toBeVisible({ timeout: 20_000 });
  await page.unroute("**/models/photos-v1/cat.jpg");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(found(page)).toHaveText("Sweep the torch to fill in the finding map.", {
    timeout: 20_000,
  });
});

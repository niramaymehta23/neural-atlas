import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** How sure is it? Wording comes from src/modules/w1-foundations/how-sure-is-it/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page, hash = "") {
  await page.goto(`/learn/how-sure-is-it${hash}`);
  await expect(page.getByTestId("how-sure-is-it")).toBeVisible({ timeout: 20_000 });
}

test("opens on the story, and the glass reads out what it sees", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/A sorter looks at flowers/).first()).toBeVisible();
  await expect(page.getByText("Confidence and probability", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("meter")).toHaveCount(5);
  const lens = page.getByRole("application", { name: "Magnifying glass" });
  const before = await lens.getAttribute("data-lens");
  await lens.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(lens).not.toHaveAttribute("data-lens", before!);
  await expect(page.getByText(/Inside the glass/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("a boastful sorter on mixed-up flowers is certain and wrong", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await page.getByRole("slider", { name: "How sure it lets itself be" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("slider", { name: "How much the groups overlap" }).focus();
  await page.keyboard.press("End");
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-certain-wrong]")).not.toBeEmpty();
  expect(errors).toEqual([]);
});

test("a link opens on the same sorter", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  const overlap = page.getByRole("slider", { name: "How much the groups overlap" });
  await overlap.focus();
  await page.keyboard.press("End");
  const value = await overlap.getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await open(fresh, new URL(page.url()).hash);
  await expect(fresh.getByRole("slider", { name: "How much the groups overlap" })).toHaveAttribute(
    "aria-valuetext",
    value!,
  );
});

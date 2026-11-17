import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Memorising vs understanding. Wording comes from src/modules/w1-foundations/memorising-vs-understanding/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page, hash = "") {
  await page.goto(`/learn/memorising-vs-understanding${hash}`);
  await expect(page.getByTestId("memorising-vs-understanding")).toBeVisible({ timeout: 20_000 });
}

test("opens on the story, then the student practises and is marked", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/A student/).first()).toBeVisible();
  await expect(page.getByText("Overfitting", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(page.locator("[data-scores]")).toContainText("On the past papers", {
    timeout: 15_000,
  });
  expect(errors).toEqual([]);
});

test("a big student with few past papers aces them and fails the exam", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await page.getByRole("slider", { name: "How many cells it can memorise with" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("slider", { name: "How many practice questions" }).focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test("a link opens on the same student", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  const cells = page.getByRole("slider", { name: "How many cells it can memorise with" });
  await cells.focus();
  await page.keyboard.press("End");
  const value = await cells.getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await open(fresh, new URL(page.url()).hash);
  await expect(
    fresh.getByRole("slider", { name: "How many cells it can memorise with" }),
  ).toHaveAttribute("aria-valuetext", value!);
});

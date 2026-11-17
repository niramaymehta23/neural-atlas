import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** The surprise test. Wording comes from src/modules/w1-foundations/the-surprise-test/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page, hash = "") {
  await page.goto(`/learn/the-surprise-test${hash}`);
  await expect(page.getByTestId("the-surprise-test")).toBeVisible({ timeout: 20_000 });
}

test("opens on the story, then practice and surprise scores appear", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/A teacher wants to know/).first()).toBeVisible();
  await expect(page.getByText("Train / test split", { exact: true })).toHaveCount(0);
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(page.locator("[data-score=practice]")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-score=surprise]")).toBeVisible();
  expect(errors).toEqual([]);
});

test("a learner that peeks has a surprise score that lies", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await page.getByRole("slider", { name: "How bendy the learner is" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("switch", { name: "Let it peek at the hidden answers" }).click();
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  const fresh = dock(page).getByRole("button", { name: "Try it on brand-new dots" });
  await expect(fresh).toBeEnabled({ timeout: 15_000 });
  await fresh.click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("a link opens on the same test", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  const hide = page.getByRole("slider", { name: "How much to hide" });
  await hide.focus();
  await page.keyboard.press("End");
  const value = await hide.getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await open(fresh, new URL(page.url()).hash);
  await expect(fresh.getByRole("slider", { name: "How much to hide" })).toHaveAttribute(
    "aria-valuetext",
    value!,
  );
});

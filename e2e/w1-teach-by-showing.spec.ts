import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Teach by showing. Wording comes from src/modules/w1-foundations/teach-by-showing/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/teach-by-showing");
  await expect(page.getByTestId("teach-by-showing")).toBeVisible({ timeout: 20_000 });
}

/** Sorts every fruit, each into its own basket or (when `wrong`) into the other one. */
async function sortAll(page: Page, wrong: boolean) {
  const done = page.getByText("All sorted! Now let the robot try new fruit.");
  for (let fruit = 0; fruit < 20 && !(await done.isVisible()); fruit += 1) {
    const label = await page
      .getByRole("img", { name: /A fruit to sort/ })
      .getAttribute("aria-label");
    const apple = label?.endsWith("apple") ?? false;
    await page
      .getByRole("button", { name: apple !== wrong ? "Apple basket" : "Pear basket" })
      .click();
  }
  await expect(done).toBeVisible();
}

test("the robot sorts new fruit after watching", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText("Machine learning", { exact: true })).toHaveCount(0);
  await sortAll(page, false);
  await dock(page).getByRole("button", { name: "Let the robot sort new fruit" }).click();
  await expect(page.locator("[data-robot-score]")).toContainText("new fruit right");
  expect(errors).toEqual([]);
});

test("wrong labels teach the robot wrong", async ({ page }) => {
  await open(page);
  await sortAll(page, true);
  await dock(page).getByRole("button", { name: "Let the robot sort new fruit" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Machine learning", { exact: true })).toBeVisible();
});

test("a link opens on the same robot result", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await sortAll(page, false);
  await dock(page).getByRole("button", { name: "Let the robot sort new fruit" }).click();
  const score = page.locator("[data-robot-score]");
  await expect(score).toContainText("new fruit right");
  const said = await score.textContent();
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/teach-by-showing${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-robot-score]")).toHaveText(said!, { timeout: 15_000 });
});

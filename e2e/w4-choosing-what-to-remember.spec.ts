import { expect, test, type Page } from "@playwright/test";
import { runEnded } from "./runs";
import { watch } from "./watch";

/**
 * Choosing what to remember. Wording comes from
 * src/modules/w4-deep-architectures/choosing-what-to-remember/captions.ts.
 */
const dock = (page: Page) => page.locator("[data-region=dock]");
const GATES = ["Keep gate", "Let-in gate", "Read-out gate"];

async function open(page: Page) {
  await page.goto("/learn/choosing-what-to-remember");
  await expect(page.getByTestId("choosing-what-to-remember")).toBeVisible({ timeout: 20_000 });
}

async function practise(page: Page) {
  await dock(page).getByRole("button", { name: "Let it practise" }).click();
  await expect(page.locator("[data-memory=remembers]")).toBeVisible({ timeout: 30_000 });
}

test("opens on its story, and the reader with gates remembers a long sentence", async ({
  page,
}) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/memory has three little gates/)).toBeVisible();
  await expect(page.getByText("LSTM / GRU", { exact: true })).toHaveCount(0);
  await practise(page);
  expect(errors).toEqual([]);
});

test("locking every gate shut leaves it guessing, and earns the star", async ({ page }) => {
  await open(page);
  await practise(page);
  for (const gate of GATES) {
    await page
      .getByRole("radiogroup", { name: gate })
      .getByRole("radio", { name: "Always shut" })
      .click();
  }
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-memory=guessing]")).toBeVisible();
});

test("a link opens with the same gates shut", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await practise(page);
  await runEnded(page);
  await page
    .getByRole("radiogroup", { name: "Keep gate" })
    .getByRole("radio", { name: "Always shut" })
    .click();
  const said = await page.locator("[data-memory]").getAttribute("data-memory");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/choosing-what-to-remember${new URL(page.url()).hash}`);
  await expect(fresh.getByTestId("choosing-what-to-remember")).toHaveAttribute(
    "data-gates",
    "shut auto auto",
  );
  await expect(fresh.locator("[data-memory]")).toHaveAttribute("data-memory", said!, {
    timeout: 30_000,
  });
});

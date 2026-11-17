import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Thinking forwards. Wording comes from src/modules/w3-neural-networks/thinking-forwards/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");

async function open(page: Page) {
  await page.goto("/learn/thinking-forwards");
  await expect(page.getByTestId("thinking-forwards")).toBeVisible({ timeout: 20_000 });
}

test("opens on its story, and a thought travels through to an answer", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await expect(page.getByText(/tell apples from bananas/)).toBeVisible();
  await expect(page.getByText("Forward pass", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Think", exact: true }).click();
  await expect(page.locator("[data-answer]")).toContainText("It thinks", { timeout: 10_000 });
  expect(errors).toEqual([]);
});

test("a fruit no tree could grow still gets a sure answer, and earns the star", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("slider", { name: "How round" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "Think", exact: true }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 15_000 });
});

test("a link opens on the same thought", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("slider", { name: "How red" }).focus();
  await page.keyboard.press("Home");
  await page.getByRole("button", { name: "Think", exact: true }).click();
  await expect(page.locator("[data-answer]")).toContainText("It thinks", { timeout: 10_000 });
  const said = await page.locator("[data-answer]").textContent();
  const red = await page.getByRole("slider", { name: "How red" }).getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/thinking-forwards${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-answer]")).toHaveText(said!, { timeout: 15_000 });
  await expect(fresh.getByRole("slider", { name: "How red" })).toHaveAttribute(
    "aria-valuetext",
    red!,
  );
});

import { expect, test, type Page } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/reading-the-internet/captions";
import { dialSays, dock, linkKeeps, open, starred, turn } from "./w5";

/** Reading the internet. Wording comes from its captions.ts. */
const id = "reading-the-internet";
const step = (page: Page) =>
  page.locator("[data-step]").first().getAttribute("data-step").then(Number);

test("practising on one sentence learns it by heart, and earns the star", async ({ page }) => {
  test.slow();
  await open(page, id, id, "[data-sample]");
  await page.locator("[data-text=sentence]").click();
  await dock(page).getByRole("button", { name: words.practise }).click();
  await expect.poll(() => step(page), { timeout: 30_000 }).toBeGreaterThan(0);
  await starred(page);
  await expect(page.locator("[data-by-heart]")).toBeVisible({ timeout: 90_000 });
  await dock(page).getByRole("button", { name: words.pause }).click();
});

test("a link opens on the same text and dials, ready to practise", async ({ page, context }) => {
  await open(page, id, id, "[data-sample]");
  await page.locator("[data-text=animals]").click();
  await turn(page, words.learning.label, "ArrowRight", 2);
  await turn(page, words.snippets.label, "ArrowLeft", 4);
  const fresh = await linkKeeps(page, context, id, [
    dialSays(words.learning.label),
    dialSays(words.snippets.label),
  ]);
  await expect(fresh.getByRole("textbox", { name: words.box })).toHaveValue(/The fox lives/);
  await expect(dock(fresh).getByRole("button", { name: words.practise })).toBeVisible();
});

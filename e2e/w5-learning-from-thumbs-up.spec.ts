import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/learning-from-thumbs-up/captions";
import { attributeOf, dialSays, linkKeeps, open, starred, turn } from "./w5";

/** Learning from thumbs-up. Wording comes from its captions.ts. */
const id = "learning-from-thumbs-up";

test("rewarding praise turns it into a yes-man, and earns the star", async ({ page }) => {
  await open(page, id, id, "[data-round]");
  await page.locator("[data-choice='0']").first().click();
  await page.getByRole("button", { name: words.undo }).first().click();
  await page.getByRole("button", { name: words.judge }).first().click();
  await starred(page);
  await expect(page.locator("[data-yes-man]").first()).toBeVisible();
});

test("works by touch, and a link keeps the picks and dials", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await open(page, id, id, "[data-round]");
  await page.locator("[data-choice='1']").first().tap();
  await page.locator("[data-choice='0']").first().tap();
  await turn(page, words.teach.label, "ArrowRight", 3);
  await turn(page, words.care.label, "ArrowLeft", 2);
  await linkKeeps(page, context, id, [
    attributeOf("[data-round]", "data-round"),
    attributeOf("[data-feature=correct]", "data-weight"),
    dialSays(words.teach.label),
    dialSays(words.care.label),
  ]);
  await context.close();
});

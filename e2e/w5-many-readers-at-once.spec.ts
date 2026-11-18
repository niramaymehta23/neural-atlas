import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/many-readers-at-once/captions";
import { dialSays, linkKeeps, open, textOf, turn } from "./w5";

/** Many readers at once. Wording comes from its captions.ts. */
const id = "many-readers-at-once";
const testId = "many-readers";

test("readers switch off by tap and by dial", async ({ page }) => {
  await open(page, id, testId, "[data-reader]");
  await page.locator('[data-reader="1"]').click();
  await expect(page.locator('[data-reader][aria-pressed="false"]')).toHaveCount(1);
  await turn(page, words.count.label, "End");
  await turn(page, words.count.label, "ArrowLeft", 4);
  await expect(page.locator('[data-reader][aria-pressed="false"]')).toHaveCount(4);
});

test("a link opens with the same readers on", async ({ page, context }) => {
  await open(page, id, testId, "[data-reader]");
  await turn(page, words.count.label, "ArrowLeft", 5);
  await linkKeeps(page, context, id, [textOf("[data-sense]"), dialSays(words.count.label)]);
});

import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/chopping-text-into-pieces/captions";
import { dialSays, linkKeeps, open, starred, textOf, turn } from "./w5";

/** Chopping text into pieces. Wording comes from its captions.ts. */
const id = "chopping-text-into-pieces";

test("a Gujarati greeting costs far more pieces, and earns the star", async ({ page }) => {
  await open(page, id, id, "[data-pieces]");
  await page.locator("[data-sample=gujarati]").click();
  await starred(page);
  await expect(page.locator("[data-more]")).toBeVisible();
});

test("a link opens on the same pieces", async ({ page, context }) => {
  await open(page, id, id, "[data-pieces]");
  await turn(page, words.known.label, "ArrowLeft", 3);
  await linkKeeps(page, context, id, [textOf("[data-cost]"), dialSays(words.known.label)]);
});

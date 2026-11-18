import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/bigger-and-bigger/captions";
import { dialSays, linkKeeps, open, starred, turn } from "./w5";

/** Bigger and bigger. Wording comes from its captions.ts. */
const id = "bigger-and-bigger";

test("pouring everything into the brain is lopsided, and earns the star", async ({ page }) => {
  await open(page, id);
  await turn(page, words.brain.label, "End");
  await turn(page, words.reading.label, "End");
  await starred(page);
  await expect(page.locator("[data-lopsided]").first()).toBeVisible();
});

test("a link opens on the same plan", async ({ page, context }) => {
  await open(page, id);
  await turn(page, words.budget.label, "ArrowRight", 2);
  await turn(page, words.brain.label, "ArrowLeft", 3);
  await linkKeeps(page, context, id, [
    dialSays(words.budget.label),
    dialSays(words.brain.label),
    dialSays(words.reading.label),
  ]);
});

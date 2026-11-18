import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/the-thinking-block/captions";
import { attributeOf, dialSays, linkKeeps, open, starred, turn } from "./w5";

/** The thinking block. Wording comes from its captions.ts. */
const id = "the-thinking-block";

test("without the shortcut every word blurs into one, and earns the star", async ({ page }) => {
  await open(page, id, id, "[data-alike]");
  await expect(page.locator("[data-blurred]")).toHaveCount(0);
  await page.getByRole("switch", { name: words.shortcut }).first().click();
  await starred(page);
  await expect(page.locator("[data-blurred]").first()).toBeVisible();
});

test("a link opens on the same stack", async ({ page, context }) => {
  await open(page, id, id, "[data-alike]");
  await turn(page, words.blocks.label, "ArrowRight", 3);
  await turn(page, words.strength.label, "ArrowLeft", 2);
  await linkKeeps(page, context, id, [
    attributeOf("[data-alike]", "data-alike"),
    dialSays(words.blocks.label),
    dialSays(words.strength.label),
  ]);
});

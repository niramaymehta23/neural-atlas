import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/words-as-places/captions";
import { dialSays, linkKeeps, open, starred, textOf, turn } from "./w5";

/** Words as places. Wording comes from its captions.ts. */
const id = "words-as-places";

test("the whole arrow lands back on king once start words count, and earns the star", async ({
  page,
}) => {
  await open(page, id, id, "[data-landing]");
  await page.getByRole("switch", { name: words.skip }).first().click();
  await turn(page, words.amount.label, "ArrowRight", 20);
  await starred(page);
  await expect(page.locator("[data-landing] li").first()).toHaveAttribute("data-word", "king");
});

test("a link opens on the same walk", async ({ page, context }) => {
  await open(page, id, id, "[data-landing]");
  await turn(page, words.amount.label, "ArrowRight", 10);
  await turn(page, words.shown.label, "End");
  await expect(page.locator("[data-landing] li")).toHaveCount(8);
  await linkKeeps(page, context, id, [textOf("[data-landing]"), dialSays(words.amount.label)]);
});

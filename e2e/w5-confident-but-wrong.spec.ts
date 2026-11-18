import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/confident-but-wrong/captions";
import { dialSays, dock, linkKeeps, open, starred, textOf, turn } from "./w5";

/** Confident but wrong. Wording comes from its captions.ts. */
const id = "confident-but-wrong";

test("it names a real book for a colour it made up, and earns the star", async ({ page }) => {
  await open(page, id, id, "[data-answer]");
  await page.getByRole("button", { name: "hen" }).first().click();
  await dock(page).getByRole("radio", { name: words.kinds.colour }).click();
  await page.getByRole("button", { name: words.askSource }).first().click();
  await starred(page);
  await expect(page.locator("[data-fake]").first()).toBeVisible();
});

test("asked to be completely sure, it holds back, and a link keeps that", async ({
  page,
  context,
}) => {
  await open(page, id, id, "[data-answer]");
  await turn(page, words.need.label, "End");
  await expect(page.locator("[data-held-back]").first()).toBeVisible();
  await turn(page, words.heat.label, "ArrowRight", 4);
  await linkKeeps(page, context, id, [
    textOf("[data-answer]"),
    dialSays(words.need.label),
    dialSays(words.heat.label),
  ]);
});

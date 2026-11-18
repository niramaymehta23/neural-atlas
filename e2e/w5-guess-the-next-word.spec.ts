import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/guess-the-next-word/captions";
import { dialSays, dock, linkKeeps, open, starred, textOf, turn } from "./w5";

/** Guess the next word. Wording comes from its captions.ts. */
const id = "guess-the-next-word";

test("always taking the likeliest word goes round in circles, and earns the star", async ({
  page,
}) => {
  await open(page, id, id, "[data-chances]");
  await dock(page).getByRole("switch", { name: words.likeliest }).click();
  await page.getByRole("button", { name: words.spinTen }).first().click();
  await page.getByRole("button", { name: words.spinTen }).first().click();
  await starred(page);
  await expect(page.getByText(words.circles).first()).toBeVisible();
});

test("works by touch, and a link writes the same story", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await open(page, id, id, "[data-chances]");
  await page.getByRole("button", { name: words.spin }).first().tap();
  await turn(page, words.length.label, "ArrowRight", 5);
  await turn(page, words.roll.label, "ArrowRight", 4);
  await expect(page.getByText(words.written(6)).first()).toBeVisible();
  await linkKeeps(page, context, id, [textOf("[data-story]"), dialSays(words.roll.label)]);
  await context.close();
});

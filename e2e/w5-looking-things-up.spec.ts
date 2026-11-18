import { expect, test } from "@playwright/test";
import { LIBRARY, words } from "../src/modules/w5-transformers/looking-things-up/captions";
import { dialSays, linkKeeps, open, starred, textOf, turn } from "./w5";

/** Looking things up. Wording comes from its captions.ts. */
const id = "looking-things-up";

test("handed the wrong book it answers from it anyway, and earns the star", async ({ page }) => {
  await open(page, id, id, "[data-answer]");
  await page
    .getByRole("button", { name: words.hand(LIBRARY[2].title) })
    .first()
    .click();
  await starred(page);
  await expect(page.locator("[data-wrong]").first()).toBeVisible();
});

test("asking for a good match makes it say it can't answer from the wrong book", async ({
  page,
}) => {
  await open(page, id, id, "[data-answer]");
  await turn(page, words.need.label, "End");
  await page
    .getByRole("button", { name: words.hand(LIBRARY[2].title) })
    .first()
    .click();
  await expect(page.locator("[data-refused]").first()).toBeVisible();
});

test("a link opens on the same question, book and dials", async ({ page, context }) => {
  await open(page, id, id, "[data-answer]");
  await page
    .getByRole("button", { name: words.hand(LIBRARY[4].title) })
    .first()
    .click();
  await turn(page, words.listed.label, "ArrowLeft", 3);
  await turn(page, words.need.label, "ArrowRight", 2);
  await linkKeeps(page, context, id, [
    textOf("[data-ranking]"),
    textOf("[data-answer]"),
    dialSays(words.listed.label),
    dialSays(words.need.label),
  ]);
});

import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/pictures-and-words-together/captions";
import { dialSays, linkKeeps, open, starred, textOf, turn } from "./w5";

/** Pictures and words together. Wording comes from its captions.ts. */
const id = "pictures-and-words-together";

test("a nearly right caption fools the map, and earns the star", async ({ page }) => {
  await open(page, id, id, "[data-photos]");
  await page
    .getByRole("button", { name: words.pickUp("a car") })
    .first()
    .click();
  await page
    .getByRole("button", { name: words.placeOn("An old bicycle", "a car") })
    .first()
    .click();
  await starred(page);
});

test("fewer tricks take trick captions off the table, and a link keeps the table", async ({
  page,
  context,
}) => {
  await open(page, id, id, "[data-photos]");
  await turn(page, words.tricks.label, "Home");
  await expect(page.getByRole("button", { name: words.pickUp("a car") })).toHaveCount(0);
  await page
    .getByRole("button", { name: words.pickUp("a happy dog") })
    .first()
    .click();
  await page.locator("[data-photo='1']").first().click();
  await turn(page, words.threshold.label, "ArrowRight", 2);
  await linkKeeps(page, context, id, [
    textOf("[data-photos]"),
    dialSays(words.tricks.label),
    dialSays(words.threshold.label),
  ]);
});

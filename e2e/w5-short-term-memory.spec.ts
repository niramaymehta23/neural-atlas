import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/short-term-memory/captions";
import { attributeOf, dialSays, linkKeeps, open, starred, turn } from "./w5";

/** Short-term memory. Wording comes from its captions.ts. */
const id = "short-term-memory";

test("a narrow tunnel forgets the pet's name, and earns the star", async ({ page }) => {
  await open(page, id, id, "[data-answer]");
  await expect(page.locator("[data-in-view]")).toHaveCount(1);
  await turn(page, words.window.label, "Home");
  await starred(page);
  await expect(page.locator("[data-in-view]")).toHaveCount(0);
});

test("a link opens on the same chat", async ({ page, context }) => {
  await open(page, id, id, "[data-answer]");
  await page.getByRole("radio", { name: words.pets.cat }).first().click();
  await turn(page, words.chatter.label, "ArrowRight", 3);
  await turn(page, words.window.label, "ArrowLeft", 6);
  await linkKeeps(page, context, id, [
    attributeOf("[data-answer]", "data-answer"),
    dialSays(words.window.label),
    dialSays(words.chatter.label),
  ]);
});

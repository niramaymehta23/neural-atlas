import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/knowing-the-order/captions";
import { attributeOf, dialSays, linkKeeps, open, starred, turn } from "./w5";

/** Knowing the order. Wording comes from its captions.ts. */
const id = "knowing-the-order";

test("with no order stamps a shuffled sentence reads the same, and earns the star", async ({
  page,
}) => {
  await open(page, id, id, "[data-difference]");
  await expect(page.getByRole("button", { name: words.earlier("bites") }).first()).toBeVisible();
  await turn(page, words.strength.label, "Home");
  await starred(page);
});

test("a link opens with the same stamps", async ({ page, context }) => {
  await open(page, id, id, "[data-difference]");
  await turn(page, words.strength.label, "ArrowLeft", 3);
  await turn(page, words.speed.label, "ArrowRight", 2);
  await linkKeeps(page, context, id, [
    attributeOf("[data-difference]", "data-difference"),
    dialSays(words.strength.label),
    dialSays(words.speed.label),
  ]);
});

import { words } from "../src/modules/w6-reinforcement/treats-and-tricks/captions";
import { attributeOf, dialSays, expect, linkKeeps, open, slowed, starred, test, turn } from "./w6";

/** Treats and tricks. Wording comes from its captions.ts. */
const id = "treats-and-tricks";
const scene = `[data-testid=${id}]`;

test("treats for spinning teach the wrong trick, and earn the star", async ({ page }) => {
  await open(page, id);
  await page.getByRole("button", { name: words.treat }).click();
  await expect(page.locator(scene)).toHaveAttribute("data-round", "1");
  await expect(page.locator("[data-last]")).toContainText("got a treat");
  await page.getByRole("radio", { name: words.trainer.rules.spin }).click();
  await page.getByRole("button", { name: words.trainer.play(10) }).click();
  await expect(page.locator(scene)).toHaveAttribute("data-round", "11");
  await starred(page);
  await expect(page.locator("[data-card=spin]")).toHaveAttribute(
    "aria-label",
    /Spin: it does this (most of the time|almost always)/,
  );
});

test("works by touch, and a link keeps every round and dial", async ({ browser }) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, reducedMotion: "reduce" }),
  );
  const page = await context.newPage();
  await open(page, id);
  await page.getByRole("button", { name: words.treat }).tap();
  await page.getByRole("button", { name: words.noTreat }).tap();
  await page.getByRole("button", { name: words.treat }).tap();
  // A dial turned mid-run is kept for the rounds after it.
  await turn(page, words.playful.label, "ArrowRight", 20);
  await turn(page, words.big.label, "ArrowLeft", 4);
  await page.getByRole("button", { name: words.treat }).tap();
  await page.getByRole("button", { name: words.noTreat }).tap();
  await expect(page.locator(scene)).toHaveAttribute("data-round", "5");
  await linkKeeps(page, context, id, [
    attributeOf(scene, "data-round"),
    attributeOf(scene, "data-trick"),
    attributeOf("[data-shares]", "data-shares"),
    dialSays(words.playful.label),
    dialSays(words.big.label),
  ]);
  await context.close();
});

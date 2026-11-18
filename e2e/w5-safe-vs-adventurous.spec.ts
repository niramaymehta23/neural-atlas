import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/safe-vs-adventurous/captions";
import { dialSays, dock, linkKeeps, open, starred, textOf, turn } from "./w5";

/** Safe vs adventurous. Wording comes from its captions.ts. */
const id = "safe-vs-adventurous";

test("turning a dial changes the chances before the next frame is drawn", async ({ page }) => {
  await open(page, id, id, "[data-chances]");
  const label = words.heat.label;
  const changed = await dock(page)
    .getByRole("slider", { name: label })
    .first()
    .evaluate(
      (dial) =>
        new Promise<boolean>((resolve) => {
          const top = () =>
            document.querySelector("[data-chances] li")?.getAttribute("data-chance") ?? "";
          const before = top();
          (dial as HTMLElement).focus();
          dial.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
          // The very next frame: the bars must already show the new chances.
          requestAnimationFrame(() => resolve(top() !== before));
        }),
    );
  expect(changed).toBe(true);
});

test("a very wild setting writes gibberish, and earns the star", async ({ page }) => {
  await open(page, id, id, "[data-chances]");
  await turn(page, words.heat.label, "End");
  await starred(page);
});

test("a link opens on the same dials and story", async ({ page, context }) => {
  await open(page, id, id, "[data-chances]");
  await turn(page, words.heat.label, "ArrowRight", 3);
  await turn(page, words.choices.label, "ArrowLeft", 100);
  await expect(page.locator("[data-writing]")).toHaveCount(0, { timeout: 20_000 });
  await linkKeeps(page, context, id, [
    textOf("[data-chances]"),
    textOf("[data-story]"),
    dialSays(words.heat.label),
    dialSays(words.choices.label),
  ]);
});

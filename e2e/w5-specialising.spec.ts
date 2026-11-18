import { expect, test, type Page } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/specialising/captions";
import { budget, recordPerf } from "./frames";
import { dialSays, dock, linkKeeps, open, starred, turn } from "./w5";

/** Specialising. Wording comes from its captions.ts. */
const id = "specialising";
const step = (page: Page) =>
  page.locator("[data-step]").first().getAttribute("data-step").then(Number);

test("practising pirate talk alone wears away everyday writing, and earns the star", async ({
  page,
}) => {
  test.slow();
  await open(page, id, id, "[data-sample]");
  await dock(page).getByRole("button", { name: words.practise }).click();
  await expect.poll(() => step(page), { timeout: 30_000 }).toBeGreaterThan(0);
  await starred(page);
  await dock(page).getByRole("button", { name: words.pause }).click();
});

test("a link opens on the same style and dials", async ({ page, context }) => {
  await open(page, id, id, "[data-sample]");
  await turn(page, words.learning.label, "ArrowLeft", 2);
  await turn(page, words.mix.label, "ArrowRight", 5);
  await linkKeeps(page, context, id, [dialSays(words.learning.label), dialSays(words.mix.label)]);
});

test(
  "it talks like a pirate within two minutes of practice",
  { tag: "@perf" },
  async ({ page }) => {
    test.setTimeout(180_000);
    await open(page, id, id, "[data-sample]");
    const started = Date.now();
    await dock(page).getByRole("button", { name: words.practise }).click();
    await expect(page.locator("[data-pirate]")).toBeVisible({ timeout: 150_000 });
    const seconds = (Date.now() - started) / 1000;
    recordPerf({ seconds, steps: await step(page) });
    budget("seconds until pirate talk", seconds, 120);
    await dock(page).getByRole("button", { name: words.pause }).click();
  },
);

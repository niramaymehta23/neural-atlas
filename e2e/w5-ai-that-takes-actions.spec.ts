import { expect, test } from "@playwright/test";
import { words } from "../src/modules/w5-transformers/ai-that-takes-actions/captions";
import { attributeOf, dialSays, dock, linkKeeps, open, starred, turn } from "./w5";

/** AI that takes actions. Wording comes from its captions.ts. */
const id = "ai-that-takes-actions";

test("a broken tool and no giving up loop until the safety limit, and earn the star", async ({
  page,
}) => {
  await open(page, id, id, "[data-steps]");
  await dock(page)
    .getByRole("radio", { name: words.brokenTool("the weather tool") })
    .click();
  await turn(page, words.patience.label, "End");
  await page.getByRole("button", { name: words.all }).first().click();
  await starred(page);
  await expect(page.locator("[data-outcome=loop]").first()).toBeVisible();
});

test("a link opens on the same job, broken tool and limits", async ({ page, context }) => {
  await open(page, id, id, "[data-steps]");
  await dock(page)
    .getByRole("radio", { name: words.brokenTool("the weather tool") })
    .click();
  await turn(page, words.patience.label, "ArrowRight", 7);
  await turn(page, words.limit.label, "Home");
  await page.getByRole("button", { name: words.all }).first().click();
  await expect(page.locator("[data-outcome=cutOff]").first()).toBeVisible();
  await linkKeeps(page, context, id, [
    attributeOf("[data-steps]", "data-steps"),
    dialSays(words.patience.label),
    dialSays(words.limit.label),
  ]);
});

import { words } from "../src/modules/w6-reinforcement/good-places-to-be/captions";
import { runEnded } from "./runs";
import {
  attributeOf,
  dialSays,
  dock,
  expect,
  linkKeeps,
  open,
  slowed,
  starred,
  test,
  turn,
} from "./w6";
import type { Page } from "@playwright/test";

/** Good places to be. Wording comes from its captions.ts. */
const id = "good-places-to-be";
/** The bowl, in the garden's far corner. */
const BOWL = 6;
const scene = (page: Page) => page.getByTestId(id);
const square = (page: Page, index: number) => scene(page).locator("[data-tile]").nth(index);

test("the glow spreads one square at a time, and hiding the bowl leaves it cold for the star", async ({
  page,
}) => {
  await open(page, id);
  await dock(page).getByRole("button", { name: words.spread }).click();
  await runEnded(page);
  await expect(scene(page)).toHaveAttribute("data-corner", "warm");
  await expect(scene(page)).toHaveAttribute("data-settled", "");
  await expect(scene(page).locator("[data-mark=plus]").first()).toBeVisible();
  // Back at the third spread, the puppy's corner was still cold.
  await page.getByRole("slider", { name: "Moment" }).focus();
  await page.keyboard.press("Home");
  for (let spread = 0; spread < 3; spread += 1) await page.keyboard.press("ArrowRight");
  await expect(scene(page)).toHaveAttribute("data-spread", "3");
  await expect(scene(page)).toHaveAttribute("data-corner", "cold");

  await dock(page).getByRole("radio", { name: words.brush.floor }).click();
  await square(page, BOWL).click();
  await expect(square(page, BOWL)).toHaveAttribute("data-tile", "floor");
  // The changed board is worked out again by itself once it rests.
  await starred(page);
  await expect(scene(page)).toHaveAttribute("data-warm", "0");
});

test("works by touch, and a link replays the same glow to the same spread", async ({ browser }) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, reducedMotion: "reduce" }),
  );
  const page = await context.newPage();
  await open(page, id);
  await dock(page).getByRole("radio", { name: words.brush.trap }).tap();
  await square(page, 20).tap();
  await expect(square(page, 20)).toHaveAttribute("data-tile", "trap");
  await turn(page, words.slippery.label, "ArrowRight", 50);
  await turn(page, words.care.label, "ArrowLeft", 15);
  await dock(page).getByRole("button", { name: words.spread }).tap();
  await expect(scene(page)).toHaveAttribute("data-settled", "", { timeout: 20_000 });
  await page.getByRole("button", { name: "Back one moment" }).tap();
  await expect(scene(page)).not.toHaveAttribute("data-settled", "");
  await linkKeeps(page, context, id, [
    attributeOf(`[data-testid=${id}]`, "data-spread"),
    attributeOf(`[data-testid=${id}]`, "data-warm"),
    attributeOf(`[data-testid=${id}]`, "data-corner"),
    attributeOf(`[data-testid=${id}] [data-tile]:nth-child(21)`, "data-tile"),
    dialSays(words.slippery.label),
    dialSays(words.care.label),
  ]);
  await context.close();
});

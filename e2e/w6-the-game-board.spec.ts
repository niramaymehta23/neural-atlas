import { words } from "../src/modules/w6-reinforcement/the-game-board/captions";
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

/** The game board. Wording comes from its captions.ts. */
const id = "the-game-board";
/** The square above the middle of the bottom lava (row 3, square 4): lava there boxes in the one below. */
const ABOVE = 17;

const scene = (page: Page) => page.getByTestId(id);
const square = (page: Page, index: number) => scene(page).locator("[data-tile]").nth(index);

test("lava on both sides of a square on a slippery floor makes a trap, and earns the star", async ({
  page,
}) => {
  await open(page, id);
  await expect(scene(page)).toHaveAttribute("data-traps", "0");
  // Lava is the brush the lesson starts with.
  await square(page, ABOVE).click();
  await expect(square(page, ABOVE)).toHaveAttribute("data-tile", "trap");
  await turn(page, words.slippery.label, "End");
  await expect(scene(page)).toHaveAttribute("data-traps", "1");
  await expect(scene(page).locator("[data-trap]")).toHaveCount(1);
  await expect(scene(page).locator("[data-trap-line]")).toHaveText(words.traps.some);
  await starred(page);
});

test("a walk plays the plan out, slides and all", async ({ page }) => {
  await open(page, id);
  await dock(page).getByRole("button", { name: words.walk.try }).click();
  await expect(scene(page)).not.toHaveAttribute("data-walk", "none");
  await expect(scene(page).locator("[data-walk-line]")).toHaveText(/That walk/, {
    timeout: 30_000,
  });
  await expect(scene(page).locator("[data-footprint]").first()).toBeVisible();
});

test("works by touch, and a link keeps the board, the dials and the walk", async ({ browser }) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, reducedMotion: "reduce" }),
  );
  const page = await context.newPage();
  await open(page, id);
  await square(page, ABOVE).tap();
  await expect(square(page, ABOVE)).toHaveAttribute("data-tile", "trap");
  await turn(page, words.slippery.label, "ArrowRight", 40);
  await turn(page, words.tiring.label, "ArrowRight", 5);
  await dock(page).getByRole("button", { name: words.walk.try }).tap();
  await dock(page).getByRole("button", { name: words.walk.again }).tap();
  await expect(scene(page).locator("[data-walk-line]")).toHaveText(/That walk/);
  await linkKeeps(page, context, id, [
    attributeOf(`[data-testid=${id}]`, "data-traps"),
    attributeOf(`[data-testid=${id}]`, "data-trip"),
    attributeOf(`[data-testid=${id}]`, "data-walk"),
    attributeOf(`[data-testid=${id}] [data-tile]:nth-child(${ABOVE + 1})`, "data-tile"),
    dialSays(words.slippery.label),
    dialSays(words.tiring.label),
  ]);
  await context.close();
});

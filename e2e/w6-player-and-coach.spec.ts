import type { Page } from "@playwright/test";
import { words } from "../src/modules/w6-reinforcement/player-and-coach/captions";
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

/** Player and coach. Wording comes from its captions.ts. */
const id = "player-and-coach";
const scene = `[data-testid=${id}]`;
const batches = (page: Page) => page.locator(scene).first().getAttribute("data-step").then(Number);

/** Every arrow's length on the player's board, in board order: equal lists, equal players. */
const arrows = async (page: Page) =>
  (
    await page
      .locator(`${scene} [data-side=player] [data-arrow]`)
      .evaluateAll((all) => all.map((arrow) => arrow.getAttribute("data-reach")))
  ).join(" ");

test("with no safety rail and forty study rounds the player falls apart, and earns the star", async ({
  page,
}) => {
  test.slow();
  await open(page, id, id, "[data-side=player]");
  await turn(page, words.clip.label, "End");
  await turn(page, words.rounds.label, "End");
  await expect(dock(page).getByRole("slider", { name: words.clip.label })).toHaveAttribute(
    "aria-valuetext",
    words.clip.describe(3),
  );
  await dock(page).getByRole("button", { name: words.practise }).click();
  // It practises in the worker and shows progress well within a minute.
  await expect.poll(() => batches(page), { timeout: 30_000 }).toBeGreaterThan(0);
  await starred(page);
  await expect(page.locator(scene).first().getByText(words.score(-1))).toBeVisible();
  await dock(page).getByRole("button", { name: words.pause, exact: true }).click();
});

test("works by touch, and a link replays the run to its saved batch", async ({ browser }) => {
  test.slow();
  const context = await slowed(await browser.newContext({ hasTouch: true }));
  const page = await context.newPage();
  await open(page, id, id, "[data-side=player]");
  await turn(page, words.rounds.label, "ArrowLeft");
  await dock(page).getByRole("button", { name: words.practise }).tap();
  await expect.poll(() => batches(page), { timeout: 60_000 }).toBeGreaterThanOrEqual(6);
  await dock(page).getByRole("button", { name: words.pause, exact: true }).tap();
  await expect(dock(page).getByRole("button", { name: words.practise })).toBeVisible();
  const fresh = await linkKeeps(page, context, id, [
    attributeOf(scene, "data-step"),
    attributeOf(scene, "data-score"),
    arrows,
    dialSays(words.clip.label),
    dialSays(words.rounds.label),
  ]);
  // A link never opens practising.
  await expect(dock(fresh).getByRole("button", { name: words.practise })).toBeVisible();
  await context.close();
});

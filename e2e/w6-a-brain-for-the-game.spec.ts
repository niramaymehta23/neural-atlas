import type { Page } from "@playwright/test";
import { words } from "../src/modules/w6-reinforcement/a-brain-for-the-game/captions";
import {
  GOOD_CATCHES,
  MOST_GAMES,
} from "../src/modules/w6-reinforcement/a-brain-for-the-game/model";
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

/** A brain for the game. Wording comes from its captions.ts. */
const id = "a-brain-for-the-game";
const scene = `[data-testid=${id}]`;
const games = (page: Page) => page.locator(scene).first().getAttribute("data-step").then(Number);

test("taking away its memory of past games stalls its practice, and earns the star", async ({
  page,
}) => {
  test.slow();
  await open(page, id, id, "[data-screen]");
  await turn(page, words.memory.label, "Home");
  await expect(dock(page).getByRole("slider", { name: words.memory.label })).toHaveAttribute(
    "aria-valuetext",
    words.memory.describe(0),
  );
  await dock(page).getByRole("button", { name: words.practise }).click();
  // It practises in the worker and shows progress well within a minute.
  await expect.poll(() => games(page), { timeout: 30_000 }).toBeGreaterThan(0);
  await expect.poll(() => games(page), { timeout: 90_000 }).toBe(MOST_GAMES);
  await starred(page);
  const catches = Number(await page.locator(scene).first().getAttribute("data-catches"));
  expect(catches).toBeLessThan(GOOD_CATCHES);
  await expect(dock(page).getByRole("button", { name: words.practise })).toBeDisabled();
});

test("works by touch, and a link replays the run to its saved game", async ({ browser }) => {
  test.slow();
  const context = await slowed(await browser.newContext({ hasTouch: true }));
  const page = await context.newPage();
  await open(page, id, id, "[data-screen]");
  await turn(page, words.learning.label, "ArrowRight");
  await dock(page).getByRole("button", { name: words.practise }).tap();
  await expect.poll(() => games(page), { timeout: 60_000 }).toBeGreaterThanOrEqual(100);
  await dock(page).getByRole("button", { name: words.pause, exact: true }).tap();
  await expect(dock(page).getByRole("button", { name: words.practise })).toBeVisible();
  const fresh = await linkKeeps(page, context, id, [
    attributeOf(scene, "data-step"),
    attributeOf(scene, "data-catches"),
    attributeOf("[data-tests]", "data-tests"),
    dialSays(words.learning.label),
    dialSays(words.memory.label),
  ]);
  // A link never opens practising.
  await expect(dock(fresh).getByRole("button", { name: words.practise })).toBeVisible();
  await context.close();
});

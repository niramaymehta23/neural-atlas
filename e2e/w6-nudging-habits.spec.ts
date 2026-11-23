import { words } from "../src/modules/w6-reinforcement/nudging-habits/captions";
import { runEnded } from "./runs";
import { watch } from "./watch";
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
  textOf,
  turn,
} from "./w6";

/** Nudging habits. Wording comes from src/modules/w6-reinforcement/nudging-habits/captions.ts. */
const id = "nudging-habits";
const scene = `[data-testid=${id}]`;

test("practising bends the arrows, and the hardest nudge goes wild and earns the star", async ({
  page,
}) => {
  const { errors } = watch(page);
  await open(page, id);
  await expect(page.locator(`${scene} [data-arrow=best]`)).toHaveCount(0);
  await dock(page).getByRole("button", { name: words.start }).click();
  await runEnded(page, 40_000);
  await expect(page.locator(scene).first()).toHaveAttribute("data-tries", "600");
  await expect(page.locator(`${scene} [data-arrow=best]`).first()).toBeVisible();
  await expect(page.locator("[data-reached]").first()).toContainText("Lately it reaches its bowl");

  // A new run starts by itself once the dial rests.
  await turn(page, words.nudge.label, "End");
  await starred(page);
  await expect(page.locator(`${scene}[data-wild]`).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("works by touch, and a link replays the same puppy", async ({ browser }) => {
  const context = await slowed(await browser.newContext({ hasTouch: true }));
  const page = await context.newPage();
  await open(page, id);
  await turn(page, words.batch.label, "ArrowUp", 3);
  await dock(page).getByRole("button", { name: words.another }).tap();
  await runEnded(page, 40_000);
  await linkKeeps(page, context, id, [
    attributeOf(scene, "data-recent"),
    textOf(`${scene} [data-status]`),
    dialSays(words.nudge.label),
    dialSays(words.batch.label),
  ]);
  await context.close();
});

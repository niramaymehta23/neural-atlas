import { words } from "../src/modules/w6-reinforcement/loopholes/captions";
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

/** Loopholes. Wording comes from its captions.ts. */
const id = "loopholes";

test("the robot tidies up, then finds all three loopholes, and earns the star", async ({
  page,
}) => {
  await open(page, id);
  await dock(page).getByRole("button", { name: words.start }).click();
  await expect(page.locator("[data-verdict]")).toHaveText(words.behaviour.tidy, {
    timeout: 20_000,
  });
  await runEnded(page, 30_000);
  await expect(page.locator("[data-now]")).toHaveText(words.now.bed);

  const pickup = dock(page).getByRole("switch", { name: words.pickup });
  await pickup.click();
  await expect(page.locator("[data-verdict]")).toHaveText(words.behaviour.juggles, {
    timeout: 20_000,
  });
  await pickup.click();
  const closer = dock(page).getByRole("switch", { name: words.closer });
  await closer.click();
  await expect(page.locator("[data-verdict]")).toHaveText(words.behaviour.paces, {
    timeout: 20_000,
  });
  await closer.click();
  await turn(page, words.moveCost.label, "End");
  await starred(page);
  await expect(page.locator("[data-loophole][data-known]")).toHaveCount(3);
});

test("works by touch, and a link replays the same day at the same moment", async ({ browser }) => {
  const context = await slowed(await browser.newContext({ hasTouch: true }));
  const page = await context.newPage();
  await open(page, id);
  await dock(page).getByRole("switch", { name: words.closer }).tap();
  await dock(page).getByRole("button", { name: words.start }).tap();
  await runEnded(page, 30_000);
  // Step back a few moments, so the link must restore a moment inside the day.
  await page.getByRole("slider", { name: "Moment" }).focus();
  for (let step = 0; step < 5; step += 1) await page.keyboard.press("ArrowLeft");
  await linkKeeps(page, context, id, [
    attributeOf("[data-testid=loopholes]", "data-moves"),
    attributeOf("[data-testid=loopholes]", "data-behaviour"),
    attributeOf("[data-found]", "data-found"),
    dialSays(words.moveCost.label),
  ]);
  await context.close();
});

import { words } from "../src/modules/w6-reinforcement/new-or-favourite/captions";
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

/** New or favourite?. Wording comes from its captions.ts. */
const id = "new-or-favourite";
const scene = `[data-testid=${id}]`;
const machine = (name: string) => new RegExp(`^Pull the ${name} machine`);

test("you play the machines, and a bot that never tries anything new earns the star", async ({
  page,
}) => {
  await open(page, id);
  await page.getByRole("button", { name: machine(words.machines.bell) }).click();
  await expect(page.locator(scene)).toHaveAttribute("data-pulls", "1");
  await expect(page.locator("[data-your-play]")).toContainText("pulls left");
  await turn(page, words.curious.label, "Home");
  await dock(page).getByRole("button", { name: words.race.start }).click();
  await starred(page);
  await expect(page.locator("[data-stuck]").first()).toContainText(words.machines.heart);
});

test("works by touch, and a link keeps your pulls and the race", async ({ browser }) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, reducedMotion: "reduce" }),
  );
  const page = await context.newPage();
  await open(page, id);
  for (const name of [words.machines.star, words.machines.moon, words.machines.bell])
    await page.getByRole("button", { name: machine(name) }).tap();
  await expect(page.locator(scene)).toHaveAttribute("data-pulls", "3");
  await turn(page, words.budget.label, "ArrowDown", 2);
  await turn(page, words.curious.label, "ArrowUp", 5);
  await dock(page).getByRole("button", { name: words.race.start }).tap();
  await expect(page.locator("[data-finished]").first()).toBeVisible({ timeout: 20_000 });
  await linkKeeps(page, context, id, [
    attributeOf(scene, "data-pulls"),
    attributeOf(scene, "data-coins"),
    attributeOf("[data-race]", "data-race"),
    attributeOf("[data-bot='0']", "data-wins"),
    attributeOf("[data-bot='1']", "data-wins"),
    dialSays(words.budget.label),
    dialSays(words.curious.label),
  ]);
  await context.close();
});

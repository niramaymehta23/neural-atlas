import { words } from "../src/modules/w6-reinforcement/practising-against-yourself/captions";
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

/** Practising against yourself. Wording comes from its captions.ts. */
const id = "practising-against-yourself";
const scene = `[data-testid=${id}]`;

test("both learning, they trade wins and Pip beats the newcomer", async ({ page }) => {
  await open(page, id);
  await dock(page).getByRole("button", { name: words.start }).click();
  await runEnded(page);
  const shown = page.locator(scene).first();
  await expect(shown).toHaveAttribute("data-newcomer", "1.0");
  await expect(shown.locator("[data-line=partner]")).toHaveAttribute("d", /L/);
  await expect(page.locator("[data-result]").first()).toContainText("Lately Pip wins");
});

test("freezing Pop teaches Pip a cheap trick, and earns the star", async ({ page }) => {
  await open(page, id);
  await dock(page).getByRole("switch", { name: words.frozen }).click();
  await dock(page).getByRole("button", { name: words.start }).click();
  await starred(page);
  await expect(page.locator(scene).first()).toHaveAttribute("data-newcomer", "0.0");
});

test("works by touch, and a link replays the same practice", async ({ browser }) => {
  const context = await slowed(await browser.newContext({ hasTouch: true }));
  const page = await context.newPage();
  await open(page, id);
  await turn(page, words.games.label, "ArrowLeft", 2);
  await turn(page, words.curiosity.label, "ArrowRight", 2);
  await dock(page).getByRole("switch", { name: words.frozen }).tap();
  await dock(page).getByRole("button", { name: words.start }).tap();
  await runEnded(page);
  await linkKeeps(page, context, id, [
    attributeOf(scene, "data-partner"),
    attributeOf(scene, "data-newcomer"),
    attributeOf(`${scene} [data-habits]`, "data-habits"),
    dialSays(words.games.label),
    dialSays(words.curiosity.label),
  ]);
  await context.close();
});

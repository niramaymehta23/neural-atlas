import { words } from "../src/modules/w6-reinforcement/now-vs-later/captions";
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

/** Now vs later. Wording comes from its captions.ts. */
const id = "now-vs-later";
const scene = (page: Page) => page.getByTestId(id);

test("the plan flips to the far bowl as it looks further ahead, and stops at “this second”", async ({
  page,
}) => {
  await open(page, id);
  await expect(scene(page)).toHaveAttribute("data-heads", "near");
  await turn(page, words.care.label, "End");
  await expect(scene(page)).toHaveAttribute("data-heads", "far");
  await expect(scene(page).locator("[data-heads-line]")).toHaveText(words.heads.far);
  await expect(scene(page).locator("[data-footprint]")).toHaveCount(10);
  await turn(page, words.care.label, "Home");
  await expect(scene(page)).toHaveAttribute("data-heads", "neither");
  await expect(scene(page).locator("[data-footprint]")).toHaveCount(0);
  await expect(scene(page).locator("[data-view]")).toHaveCount(0);
  await starred(page);
});

test("works by touch, and a link keeps both dials and the plan", async ({ browser }) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, reducedMotion: "reduce" }),
  );
  const page = await context.newPage();
  await open(page, id);
  // A tap at the start of the dial's arc turns it right down: only this very second.
  await dock(page)
    .getByRole("slider", { name: words.care.label })
    .tap({ position: { x: 12, y: 68 } });
  await expect(dock(page).getByRole("slider", { name: words.care.label })).toHaveAttribute(
    "aria-valuetext",
    words.care.second,
  );
  await turn(page, words.care.label, "ArrowRight", 90);
  await turn(page, words.prize.label, "ArrowRight", 6);
  await expect(scene(page)).toHaveAttribute("data-heads", "far");
  await linkKeeps(page, context, id, [
    attributeOf(`[data-testid=${id}]`, "data-heads"),
    attributeOf("[data-telescope] [data-bowl=far]", "data-counts"),
    attributeOf("[data-telescope]", "data-horizon"),
    dialSays(words.care.label),
    dialSays(words.prize.label),
  ]);
  await context.close();
});

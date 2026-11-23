import type { Page } from "@playwright/test";
import { words } from "../src/modules/w6-reinforcement/survival-of-the-fittest/captions";
import { expectSmooth, measureFrames, settle } from "./frames";
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
  type Reader,
} from "./w6";

/** Survival of the fittest. Wording comes from src/modules/w6-reinforcement/survival-of-the-fittest/captions.ts. */
const id = "survival-of-the-fittest";
const scene = `[data-testid=${id}]`;
/** The track is ten squares wide; the cars start on square 55 (row 5, column 5). */
const square = (page: Page, index: number) => page.locator(`${scene} [data-tile]`).nth(index);
const grass = (page: Page) => page.locator(`${scene} [data-grass]`).count();
const grassCount: Reader = async (on) => String(await grass(on));

test("a broken track says so, and nearly brand-new cars every race earn the star", async ({
  page,
}) => {
  const { errors } = watch(page);
  await open(page, id);
  await dock(page).getByRole("radio", { name: words.brush.grass }).click();
  // The square just after the start line: grass there leaves no way round.
  await square(page, 56).click();
  await expect(page.getByText(words.noWay)).toBeVisible();
  await expect(dock(page).getByRole("button", { name: words.start })).toBeDisabled();
  await dock(page).getByRole("button", { name: words.tracks.twisty }).click();
  await expect(page.getByText(words.noWay)).toHaveCount(0);

  await dock(page).getByRole("button", { name: words.start }).click();
  await runEnded(page, 40_000);
  await expect(page.locator(scene)).toHaveAttribute("data-generation", "50");
  await expect(page.locator(`${scene} [data-car=best]`)).toBeVisible();
  await expect(page.locator("[data-furthest-line]")).toContainText("The best car got");

  // A new run starts by itself once the dial rests.
  await turn(page, words.change.label, "End");
  await starred(page);
  await expect(page.locator(`${scene}[data-stuck]`)).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe("on a phone", () => {
  test("a swipe scrolls past the track, a hold paints, and a link keeps the track and races", async ({
    browser,
  }) => {
    const context = await slowed(
      await browser.newContext({
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
      }),
    );
    const page = await context.newPage();
    await open(page, id);
    const board = page.locator(scene).getByRole("application");
    await board.scrollIntoViewIfNeeded();
    const box = await board.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const cdp = await context.newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });

    // A swipe scrolls the page and paints nothing.
    const before = await grass(page);
    const scrolled = await page.evaluate(() => window.scrollY);
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.8;
    await touch("touchStart", x, y);
    for (let step = 1; step <= 8; step += 1) await touch("touchMove", x, y - step * 25);
    await touch("touchEnd", x, y - 200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled);
    expect(await grass(page)).toBe(before);

    // Held still, a finger paints: road over the top-left grass square.
    await board.scrollIntoViewIfNeeded();
    const corner = await square(page, 0).boundingBox();
    expect(corner).not.toBeNull();
    if (!corner) return;
    await touch("touchStart", corner.x + corner.width / 2, corner.y + corner.height / 2);
    await page.waitForTimeout(600);
    await touch("touchEnd", corner.x + corner.width / 2, corner.y + corner.height / 2);
    await expect.poll(() => grass(page)).toBe(before - 1);

    await turn(page, words.carsDial.label, "ArrowDown", 6);
    await dock(page).getByRole("button", { name: words.start }).tap();
    await runEnded(page, 40_000);
    await linkKeeps(page, context, id, [
      grassCount,
      attributeOf(scene, "data-furthest"),
      textOf(`${scene} [data-status]`),
      dialSays(words.carsDial.label),
      dialSays(words.change.label),
    ]);
    await context.close();
  });
});

test(
  "the page keeps drawing while the races are worked out and the cars drive",
  { tag: "@perf" },
  async ({ page }) => {
    await open(page, id);
    await settle(page);
    const idle = await measureFrames(page, 3);
    await dock(page).getByRole("button", { name: words.start }).click();
    expectSmooth(idle, await measureFrames(page, 3));
  },
);

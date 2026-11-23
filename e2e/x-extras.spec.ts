import type { Page } from "@playwright/test";
import { lessonById, lessons } from "../src/catalog";
import { constellationCaptions } from "../src/constellation/captions";
import { achievements } from "../src/experiences/achievements/achievements";
import { exploreCaptions } from "../src/experiences/explore/captions";
import { glossaryCaptions as cards } from "../src/experiences/glossary/captions";
import { pages, shellCaptions } from "../src/experiences/shell/captions";
import { platformCaptions } from "../src/platform/captions";
import { uiCaptions } from "../src/ui/captions";
import { earned, expect, noSidewaysScroll, openPage, slowed, SOON, test, watch } from "./x";

/** REQ-EXP-06: idea cards from any caption, achievements on the map, and the way to everything. */
const card = (page: Page, id: string) => page.locator(`[data-card="${id}"]`);

test("every page leads to more to do, and from there to everything", async ({ page }) => {
  const { errors, elsewhere } = watch(page);
  await openPage(page, "/", "h1");
  await page.getByRole("link", { name: pages.explore.title }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole("heading", { level: 1, name: pages.explore.title })).toBeVisible();
  for (const { path, title } of [
    pages.sandbox,
    pages.journeys,
    pages.museum,
    pages.theatre,
    pages.twoPlayer,
  ]) {
    await openPage(page, "/explore", "h1");
    await page.getByRole("link", { name: exploreCaptions.open(title), exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
  await openPage(page, "/learn/rolling-downhill", "[data-region=scene]");
  await expect(page.getByRole("link", { name: pages.explore.title })).toBeVisible();
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("the search box finds the other pages", async ({ page }) => {
  await openPage(page, "/explore", "h1");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox").fill("museum");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/museum$/);
});

test("a lesson's caption opens its card, whose real name waits for a touch", async ({ page }) => {
  await openPage(page, "/learn/rolling-downhill", "[data-region=scene]");
  await page.getByRole("button", { name: uiCaptions.ideaCard }).first().click();
  const open = card(page, "rolling-downhill");
  await expect(open).toBeVisible(SOON);
  await expect(open.getByText("Gradient descent")).toHaveCount(0);
  await open.getByRole("button", { name: cards.mini.valley.step }).click();
  await expect(open.getByText("Gradient descent")).toBeVisible();
  // On to an idea close by, then out with Escape, back where it was opened.
  await open.getByRole("navigation", { name: cards.nearby }).getByRole("button").first().click();
  await expect(card(page, "rolling-downhill")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-card]")).toHaveCount(0);
});

test("every idea has a card that opens, and a small thing that works by keyboard", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const { errors } = watch(page);
  await openPage(page, "/explore", "h1");
  for (const { id, title, realTerm } of lessons) {
    await page.getByRole("button", { name: exploreCaptions.openCard(title), exact: true }).click();
    const open = card(page, id);
    await expect(open.getByRole("heading", { name: title })).toBeVisible(SOON);
    const play = open.getByRole("region", { name: cards.tryIt });
    const slider = play.getByRole("slider");
    if ((await slider.count()) > 0) {
      await slider.first().focus();
      await page.keyboard.press("ArrowRight");
    } else {
      await play.getByRole("button").first().focus();
      await page.keyboard.press("Enter");
    }
    await expect(open.getByText(realTerm, { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(open).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("a card opens by touch on a phone, inside the screen, and leads to its lesson", async ({
  browser,
}) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, viewport: { width: 320, height: 640 } }),
  );
  const page = await context.newPage();
  await openPage(page, "/explore", "h1");
  await noSidewaysScroll(page);
  const title = lessonById("who-is-looking-at-whom")?.title ?? "";
  await page.getByRole("button", { name: exploreCaptions.openCard(title), exact: true }).tap();
  const open = card(page, "who-is-looking-at-whom");
  await expect(open).toBeVisible(SOON);
  const box = await open.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
  expect(await open.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  await open.getByRole("link", { name: cards.open(title) }).tap();
  await expect(page).toHaveURL(/\/learn\/who-is-looking-at-whom$/);
  await context.close();
});

test("a card that cannot be fetched says so, and tries again", async ({ page }) => {
  await openPage(page, "/explore", "h1");
  await page.waitForLoadState("networkidle");
  await page.route(/\.js$/, (route) => route.abort());
  await page.getByRole("button", { name: exploreCaptions.openCard("Zooming out") }).click();
  await expect(page.getByRole("alert").filter({ hasText: shellCaptions.card.failed })).toBeVisible(
    SOON,
  );
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.getByRole("button", { name: platformCaptions.problem.retry }).click();
  await expect(card(page, "zooming-out")).toBeVisible(SOON);
});

test("an achievement is kept, and adds a star to the map and to the list", async ({ page }) => {
  await openPage(page, "/explore", "h1");
  await expect(page.locator('[data-achievement="words"]')).toHaveAttribute("data-earned", "false");
  for (const title of ["Zooming out", "Loopholes", "Don't cram"]) {
    await page.getByRole("button", { name: exploreCaptions.openCard(title), exact: true }).click();
    await expect(page.getByRole("dialog", { name: title })).toBeVisible(SOON);
    await page.keyboard.press("Escape");
  }
  await earned(page, "words");
  const mark = page.locator('[data-achievement="words"]');
  await expect(mark).toHaveAttribute("data-earned", "true");
  await page.reload();
  await expect(mark).toHaveAttribute("data-earned", "true", SOON);

  await openPage(page, "/", "[data-star]");
  const star = page.locator('[data-achievement="words"]');
  await expect(star).toBeVisible(SOON);
  const title = achievements.find(({ id }) => id === "words")?.title ?? "";
  await expect(star).toHaveAccessibleName(constellationCaptions.extra(title));
  await star.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/explore$/);
});

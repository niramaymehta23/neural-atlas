import { expect, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { platformCaptions } from "../src/platform/captions";
import { achievements } from "../src/experiences/achievements/achievements";
import { achievementCaptions } from "../src/experiences/achievements/captions";
import type { Reader } from "./w5";

/**
 * Shared steps for the experiences' browser tests (`e2e/x-*.spec.ts`). Like World 6's, they run on
 * a CPU slowed four times with `E2E_CPU_THROTTLE=4` (see `e2e/slowed.ts`).
 */
export { expect, slowed, test } from "./slowed";
export { attributeOf, textOf, type Reader } from "./w5";
export { watch } from "./watch";

/** Long enough for a whole run to be watched on a slow machine. */
export const RUN = { timeout: 60_000 };
export const SOON = { timeout: 20_000 };

/** Opens an experience and waits until it is ready to be played with. */
export async function openPage(page: Page, path: string, ready: string) {
  await page.goto(path);
  await expect(page.locator(ready).first()).toBeVisible(SOON);
}

/** The note that says a star was earned. */
export async function earned(page: Page, id: string) {
  const title = achievements.find((known) => known.id === id)?.title ?? "";
  await expect(page.locator(`[data-award="${id}"]`)).toContainText(
    achievementCaptions.earned(title),
    SOON,
  );
}

/** Copies a link to the view and opens it in a fresh page, where every reader reads the same. */
export async function linkReplays(
  page: Page,
  context: BrowserContext,
  path: string,
  readers: Reader[],
) {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const before = await Promise.all(readers.map((read) => read(page)));
  for (const said of before) expect(said).not.toBe("");
  await page.getByRole("button", { name: platformCaptions.share }).click();
  await expect(page.locator("[data-share]").getByText(platformCaptions.shared)).toBeVisible();
  const fresh = await context.newPage();
  await fresh.goto(`${path}${new URL(page.url()).hash}`);
  await expect.poll(() => Promise.all(readers.map((read) => read(fresh))), RUN).toEqual(before);
  await expect(fresh.getByText(platformCaptions.link.theirs)).toBeVisible();
  return fresh;
}

/** A damaged link opens a fresh start, and says so. */
export async function damagedLinkSaysSo(page: Page, path: string, ready: string) {
  await openPage(page, `${path}#s=not-a-link`, ready);
  await expect(page.locator("[data-link-problem]")).toHaveText(platformCaptions.link.broken);
}

/** Keeps the lab's worker from starting (Turbopack's bootstrap script, or the worker itself). */
export const breakWorkers = (page: Page) =>
  page.route(/\/(turbopack-worker-[^/]+\.js|media\/[^/]*worker[^/]*)$/, (route) =>
    route.fulfill({ status: 404, body: "" }),
  );

/** Where an element is on the page, for checking that nothing jumps. */
export async function placeOf(locator: Locator) {
  return locator.evaluate((element) => {
    const { top, left, height } = element.getBoundingClientRect();
    return {
      top: Math.round(top + window.scrollY),
      left: Math.round(left),
      height: Math.round(height),
    };
  });
}

/** Nothing sticks out sideways. */
export async function noSidewaysScroll(page: Page) {
  const { wide, view } = await page.evaluate(() => ({
    wide: document.documentElement.scrollWidth,
    view: document.documentElement.clientWidth,
  }));
  expect(wide).toBeLessThanOrEqual(view);
}

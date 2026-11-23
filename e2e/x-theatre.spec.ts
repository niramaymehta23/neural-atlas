import type { CDPSession, Page } from "@playwright/test";
import { theatreCaptions as words } from "../src/experiences/theatre/captions";
import { SHOWS } from "../src/experiences/theatre/programme";
import { platformCaptions } from "../src/platform/captions";
import { expectSmooth, measureFrames, settle } from "./frames";
import { expect, noSidewaysScroll, openPage, RUN, slowed, SOON, test, watch } from "./x";

/** REQ-EXP-03: a full screen of a model thinking, for as long as anybody likes. */
const READY = "[data-playing=true]";
const stage = "[data-theatre]";

/** A cheap fingerprint of what is drawn, to see whether it changes. */
const picture = (page: Page) =>
  page.locator("canvas").evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("no canvas");
    const pixels = element.getContext("2d")?.getImageData(0, 0, element.width, element.height).data;
    let sum = 0;
    for (let at = 0; at < (pixels?.length ?? 0); at += 4)
      sum = (sum * 31 + (pixels?.[at] ?? 0) + (pixels?.[at + 1] ?? 0)) % 1_000_000_007;
    return sum;
  });

for (const show of SHOWS) {
  test(`${words.programme[show]} plays, pauses and carries on`, async ({ page }) => {
    const { errors, elsewhere } = watch(page);
    await openPage(page, `/theatre#show=${show}`, READY);
    await expect(page.locator(stage)).toHaveAttribute("data-theatre", show);
    const first = await picture(page);
    await expect.poll(() => picture(page), SOON).not.toBe(first);
    await page.mouse.move(200, 200);
    await page.getByRole("button", { name: words.pause }).click();
    await expect(page.locator(stage)).toHaveAttribute("data-playing", "false");
    await page.waitForTimeout(200);
    const held = await picture(page);
    await page.waitForTimeout(500);
    expect(await picture(page)).toBe(held);
    // Space carries on, from anywhere but a button.
    await page.locator("h1").focus();
    await page.keyboard.press("Space");
    await expect(page.locator(stage)).toHaveAttribute("data-playing", "true");
    await expect.poll(() => picture(page), SOON).not.toBe(held);
    expect(errors).toEqual([]);
    expect(elsewhere).toEqual([]);
  });
}

test("fills the screen, and the controls fade until somebody moves", async ({ page }) => {
  await openPage(page, "/theatre", READY);
  await page.mouse.move(300, 300);
  await page.getByRole("button", { name: words.full }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await expect(page.getByRole("button", { name: words.shrink })).toBeVisible();
  const box = await page.locator(stage).boundingBox();
  const view = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  expect(box).toMatchObject({ x: 0, y: 0, ...view });

  await page.mouse.move(320, 320);
  await expect(page.locator(stage)).toHaveAttribute("data-idle", "true", SOON);
  await expect(page.locator("[data-controls]")).toHaveCSS("opacity", "0");
  await page.mouse.move(340, 340);
  await expect(page.locator("[data-controls]")).toHaveCSS("opacity", "1");
  // A key brings them back too, and what has the focus is never faded.
  await expect(page.locator(stage)).toHaveAttribute("data-idle", "true", SOON);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator("[data-controls]")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: words.shrink }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
});

test("a tap that wakes the controls presses none of them", async ({ browser }) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 700 } }),
  );
  const page = await context.newPage();
  await openPage(page, "/theatre#show=shapes", READY);
  await noSidewaysScroll(page);
  const pause = await page.getByRole("button", { name: words.pause }).boundingBox();
  if (!pause) throw new Error("no pause button");
  await expect(page.locator(stage)).toHaveAttribute("data-idle", "true", SOON);
  await page.touchscreen.tap(pause.x + pause.width / 2, pause.y + pause.height / 2);
  await expect(page.locator(stage)).toHaveAttribute("data-idle", "false");
  await expect(page.locator(stage)).toHaveAttribute("data-playing", "true");
  await page.touchscreen.tap(pause.x + pause.width / 2, pause.y + pause.height / 2);
  await expect(page.locator(stage)).toHaveAttribute("data-playing", "false");
  await context.close();
});

test("under reduced motion it is a still picture that changes now and then", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPage(page, "/theatre#show=words", READY);
  await page.waitForTimeout(500);
  const changes = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const context = document.querySelector("canvas")?.getContext("2d");
        if (!context) throw new Error("no canvas");
        let drawn = 0;
        const fill = context.fillRect.bind(context);
        context.fillRect = (x, y, width, height) => {
          if (x === 0 && y === 0 && width >= innerWidth - 1) drawn += 1;
          fill(x, y, width, height);
        };
        setTimeout(() => resolve(drawn), 6000);
      }),
  );
  expect(changes).toBeGreaterThan(0);
  expect(changes).toBeLessThanOrEqual(3);
});

test("without the storyteller's files it says so, and the other shows still play", async ({
  page,
}) => {
  await page.route(/\/models\//, (route) => route.abort());
  await openPage(page, "/theatre", READY);
  await page.mouse.move(200, 200);
  await expect(page.locator(stage)).toHaveAttribute("data-theatre", "shapes");
  await page.getByRole("button", { name: words.programme.words }).click();
  await expect(page.getByRole("alert").filter({ hasText: words.failed })).toBeVisible();
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.getByRole("button", { name: platformCaptions.problem.retry }).click();
  await expect(page.locator(stage)).toHaveAttribute("data-theatre", "words");
  await expect(page.locator(READY)).toBeVisible(SOON);
});

/** What is alive in the page once everything that can be collected has been. */
async function alive(cdp: CDPSession) {
  for (let at = 0; at < 3; at += 1) await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  const of = (name: string) => metrics.find((metric) => metric.name === name)?.value ?? 0;
  return {
    heap: of("JSHeapUsedSize"),
    nodes: of("Nodes"),
    listeners: of("JSEventListeners"),
  };
}

test("half an hour of it, sped up, keeps no more memory than the first minutes", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.clock.install();
  await openPage(page, "/theatre", "h1");
  // Pictures arrive as the clock is moved on; the storyteller's files are fetched meanwhile.
  await expect(async () => {
    await page.clock.runFor(1000);
    await expect(page.locator(READY)).toBeVisible({ timeout: 200 });
  }).toPass(RUN);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.enable");
  /** Moves the page's own clock on, drawing every frame on the way. */
  const watchFor = async (minutes: number) => {
    for (let at = 0; at < minutes; at += 1) await page.clock.runFor(60_000);
  };
  // A whole round of the three shows first: their models, fonts and caches are now made.
  await watchFor(7);
  const start = await alive(cdp);
  await watchFor(30);
  const end = await alive(cdp);
  test.info().annotations.push({
    type: "memory",
    description: JSON.stringify({ start, end }),
  });
  expect(end.heap - start.heap).toBeLessThan(2_000_000);
  expect(end.nodes - start.nodes).toBeLessThan(200);
  expect(end.listeners - start.listeners).toBeLessThan(20);
});

for (const show of SHOWS)
  test(
    `${words.programme[show]} keeps the page at full speed`,
    { tag: "@perf" },
    async ({ page }) => {
      await openPage(page, "/explore", "h1");
      await settle(page);
      const idle = await measureFrames(page, 3);
      await openPage(page, `/theatre#show=${show}`, READY);
      await settle(page);
      expectSmooth(idle, await measureFrames(page, 3));
    },
  );

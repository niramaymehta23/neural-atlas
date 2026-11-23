import { museumCaptions as words } from "../src/experiences/museum/captions";
import { rooms } from "../src/experiences/museum/rooms";
import { shellCaptions } from "../src/experiences/shell/captions";
import { platformCaptions } from "../src/platform/captions";
import {
  earned,
  expect,
  noSidewaysScroll,
  openPage,
  placeOf,
  RUN,
  slowed,
  SOON,
  test,
  watch,
} from "./x";

/** REQ-EXP-02: the museum is a timeline to scroll, from 1958 to today, with exhibits to play. */
const READY = "[data-room]";

test("the rooms go from the perceptron to today's helpers, oldest first", async ({ page }) => {
  await openPage(page, "/museum", READY);
  const years = await page.locator("[data-room] time").allTextContents();
  expect(years).toEqual(rooms.map(({ year }) => `${year}`));
  expect(years.map(Number)).toEqual(years.map(Number).sort((a, b) => a - b));
  expect(years[0]).toBe("1958");
  await expect(page.locator("[data-room=chat]")).toContainText("ChatGPT");
  for (const { title } of rooms)
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
});

test("every exhibit comes out and plays without breaking", async ({ page }) => {
  test.setTimeout(240_000);
  const { errors, elsewhere } = watch(page);
  await openPage(page, "/museum", READY);
  for (const { id, title, exhibit } of rooms.filter(({ id }) => id !== "alexnet")) {
    const room = page.locator(`[data-room="${id}"]`);
    await room.getByRole("button", { name: words.playNamed(title) }).click();
    const out =
      exhibit.kind === "pair"
        ? room.locator("[data-pair]")
        : room.locator("[data-region=stage] [data-testid]").first();
    await expect(out).toBeVisible({ timeout: 30_000 });
    await expect(room.getByText(platformCaptions.problem.title)).toHaveCount(0);
    // One exhibit at a time.
    await expect(page.locator("[data-region=stage], [data-pair]")).toHaveCount(1);
    await expect(room.getByText(words.lead)).toBeVisible();
  }
  await earned(page, "museum");
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("the photo reader's exhibit comes out too", { tag: "@gpu" }, async ({ page }) => {
  test.setTimeout(120_000);
  await openPage(page, "/museum#room=alexnet", READY);
  const room = page.locator("[data-room=alexnet]");
  await room.getByRole("button", { name: words.play }).click();
  await expect(room.locator("[data-region=stage] [data-testid]").first()).toBeVisible(RUN);
});

test("one straight fence fails at four corners, and a team does not", async ({ page }) => {
  test.setTimeout(150_000);
  await openPage(page, "/museum#room=book", READY);
  const room = page.locator("[data-room=book]");
  await room.getByRole("button", { name: words.play }).click();
  const start = room.getByRole("button", { name: shellCaptions.play });
  await start.click();
  await expect(room.getByRole("button", { name: shellCaptions.replay })).toBeVisible(RUN);
  await expect(room.getByText(/poor match|No better than guessing/)).toBeVisible();
  await room.getByRole("radio", { name: "A small team" }).click();
  await room.getByRole("button", { name: shellCaptions.play }).click();
  await expect(room.getByRole("button", { name: shellCaptions.replay })).toBeVisible(RUN);
  await expect(room.getByText(/worked out|Mostly there/)).toBeVisible();
});

test("a year leads to its room, and putting an exhibit away moves nothing", async ({ page }) => {
  await openPage(page, "/museum", READY);
  await page.getByRole("link", { name: /^2016/ }).click();
  await expect(page.locator("[data-room=go]").getByRole("heading")).toBeInViewport();
  await expect(page).toHaveURL(/#room=go$/);
  const room = page.locator("[data-room=words]");
  await room.getByRole("button", { name: words.play }).click();
  await expect(room.locator("[data-region=stage] [data-testid]").first()).toBeVisible(SOON);
  await page.waitForTimeout(1000);
  const next = page.locator("[data-room=forger] h2");
  const before = await placeOf(next);
  await room.getByRole("button", { name: words.away }).click();
  await expect(room.locator("[data-region=stage]")).toHaveCount(0);
  expect((await placeOf(next)).top).toBe(before.top);
  // Nowhere in particular is the top.
  await page.goto("about:blank");
  await openPage(page, "/museum#room=nowhere", READY);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("works by touch on a phone", async ({ browser }) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 700 } }),
  );
  const page = await context.newPage();
  await openPage(page, "/museum", READY);
  const room = page.locator("[data-room=attention]");
  await room.getByRole("button", { name: words.play }).tap();
  await expect(room.locator("[data-region=stage] [data-testid]").first()).toBeVisible(SOON);
  await noSidewaysScroll(page);
  await context.close();
});

import { meterCaptions } from "../src/experiences/meter/captions";
import { sandboxCaptions as words } from "../src/experiences/sandbox/captions";
import { shellCaptions } from "../src/experiences/shell/captions";
import { expectSmooth, measureFrames, settle } from "./frames";
import {
  attributeOf,
  breakWorkers,
  damagedLinkSaysSo,
  earned,
  expect,
  linkReplays,
  noSidewaysScroll,
  openPage,
  placeOf,
  RUN,
  slowed,
  SOON,
  test,
  watch,
} from "./x";

/** REQ-EXP-01: any learner on any garden, and any learner on any board, train live. */
const READY = "[data-run]";
const run = "[data-run]";
const steps = (page: Parameters<typeof openPage>[0]) =>
  page.locator("[data-steps]").getAttribute("data-steps").then(Number);
const right = (page: Parameters<typeof openPage>[0]) =>
  page.locator("[data-steps]").getAttribute("data-right").then(Number);
const finished = async (page: Parameters<typeof openPage>[0]) => {
  await expect(page.locator(run)).toHaveText(shellCaptions.replay, RUN);
  await expect(page.locator(run)).toHaveAttribute("data-run", "off");
};

test("a straight line cannot learn a ring and a team can, with the computing counted", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const { errors, elsewhere } = watch(page);
  await openPage(page, "/sandbox", READY);
  await page.getByRole("radio", { name: words.gardens.names.circles }).click();
  await page.getByRole("radio", { name: words.models.names.line }).click();
  await expect(page.getByText(meterCaptions.none)).toBeVisible();
  await page.locator(run).click();
  await finished(page);
  expect(await right(page)).toBeLessThan(0.75);
  await earned(page, "sandbox-garden");
  const meter = page.locator("[data-multiplications]");
  const lineCost = Number(await meter.getAttribute("data-multiplications"));
  expect(lineCost).toBeGreaterThan(100);

  // Another learner is another run, from the start.
  await page.getByRole("radio", { name: words.models.names.team }).click();
  expect(await steps(page)).toBe(0);
  await page.locator(run).click();
  await expect.poll(() => steps(page), SOON).toBeGreaterThan(0);
  await finished(page);
  expect(await right(page)).toBeGreaterThan(0.9);
  const teamCost = Number(await meter.getAttribute("data-multiplications"));
  expect(teamCost).toBeGreaterThan(lineCost);

  // The same run again counts the same multiplications: they are the engine's own.
  await page.locator(run).click();
  await expect.poll(() => steps(page), SOON).toBeLessThan(10);
  await finished(page);
  expect(Number(await meter.getAttribute("data-multiplications"))).toBe(teamCost);
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("a score keeper learns a kitchen, and a blocked bowl is said to be blocked", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openPage(page, "/sandbox", READY);
  await page.getByRole("radio", { name: words.place.board }).click();
  await page.getByRole("radio", { name: words.boards.names.kitchen }).click();
  await page.getByRole("radio", { name: words.agents.names.scores }).click();
  await page.locator(run).click();
  await finished(page);
  expect(await right(page)).toBeGreaterThan(0.8);
  await earned(page, "sandbox-board");

  // Wall the bowl in with the keyboard alone: the squares left of it and below it.
  await page.getByRole("radio", { name: words.board.brush.names.wall }).click();
  const board = page.getByRole("application").or(page.locator("[data-region=stage] svg[tabindex]"));
  await board.first().focus();
  for (let at = 0; at < 8; at += 1) await page.keyboard.press("ArrowUp");
  for (let at = 0; at < 8; at += 1) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-note]")).toHaveText(words.board.blocked);
  expect(await steps(page)).toBe(0);
});

test("changing the pair in the middle of a run starts the new run cleanly", async ({ page }) => {
  await openPage(page, "/sandbox", READY);
  await page.locator(run).click();
  await expect.poll(() => steps(page), SOON).toBeGreaterThan(3);
  await page.getByRole("radio", { name: words.models.names.questions }).click();
  await expect(page.locator(run)).toHaveAttribute("data-run", "off");
  // Steps of the old run still on their way change nothing.
  await page.waitForTimeout(600);
  expect(await steps(page)).toBe(0);
  await expect(page.getByText(words.result.gardenStart, { exact: true })).toBeVisible();
});

test("nothing moves while it learns, on a computer or a phone", async ({ page }) => {
  await openPage(page, "/sandbox", READY);
  for (const size of [
    { width: 1280, height: 800 },
    { width: 375, height: 700 },
  ]) {
    await page.setViewportSize(size);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("button", { name: shellCaptions.again }).waitFor();
    const before = await placeOf(page.locator(run));
    const meterBefore = await placeOf(page.locator("[data-multiplications]"));
    await page.locator(run).click();
    await expect.poll(() => steps(page), SOON).toBeGreaterThan(10);
    await page.locator(run).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await placeOf(page.locator(run))).toEqual(before);
    expect((await placeOf(page.locator("[data-multiplications]"))).top).toBe(meterBefore.top);
    await noSidewaysScroll(page);
    await page.getByRole("button", { name: shellCaptions.again }).click();
  }
});

test("works by touch, and a link replays your own garden at the same step", async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await slowed(
    await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 800 } }),
  );
  const page = await context.newPage();
  await openPage(page, "/sandbox", READY);
  await page.getByRole("radio", { name: words.gardens.names.own }).tap();
  const garden = page.getByRole("application", { name: words.garden.label });
  const box = await garden.boundingBox();
  if (!box) throw new Error("no garden");
  await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.getByRole("radio", { name: words.models.names.neighbours }).tap();
  await page.locator(run).tap();
  await expect.poll(() => steps(page), SOON).toBeGreaterThan(5);
  await page.locator(run).tap();
  await expect(page.locator(run)).toHaveAttribute("data-run", "off");
  await page.waitForTimeout(300);
  await linkReplays(page, context, "/sandbox", [
    attributeOf("[data-steps]", "data-steps"),
    attributeOf("[data-steps]", "data-right"),
    attributeOf("[data-multiplications]", "data-multiplications"),
    async (on) => `${await on.locator("[data-dot]").count()}`,
  ]);
  await context.close();
});

test("a damaged link is said to be damaged, and it all works from there", async ({ page }) => {
  await damagedLinkSaysSo(page, "/sandbox", READY);
  await page.locator(run).click();
  await expect.poll(() => steps(page), SOON).toBeGreaterThan(0);
});

test("says so when its worker cannot start, and starting over tries again", async ({ page }) => {
  await breakWorkers(page);
  await openPage(page, "/sandbox", READY);
  await page.locator(run).click();
  await expect(page.getByRole("alert").filter({ hasText: shellCaptions.workerFailed })).toBeVisible(
    SOON,
  );
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.getByRole("button", { name: shellCaptions.again }).click();
  await page.locator(run).click();
  await expect.poll(() => steps(page), SOON).toBeGreaterThan(0);
});

test("a big team learning keeps the page at full speed", { tag: "@perf" }, async ({ page }) => {
  await openPage(page, "/sandbox", READY);
  await page.getByRole("radio", { name: words.gardens.names.spiral }).click();
  await page.getByRole("radio", { name: words.models.names.bigTeam }).click();
  await settle(page);
  const idle = await measureFrames(page, 3);
  await page.locator(run).click();
  await expect.poll(() => steps(page), SOON).toBeGreaterThan(2);
  const before = await steps(page);
  expectSmooth(idle, await measureFrames(page, 3));
  expect(await steps(page)).toBeGreaterThan(before);
});

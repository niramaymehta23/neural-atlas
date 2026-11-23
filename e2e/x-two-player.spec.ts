import type { Page } from "@playwright/test";
import { twoPlayerCaptions as words } from "../src/experiences/two-player/captions";
import { shellCaptions } from "../src/experiences/shell/captions";
import {
  attributeOf,
  breakWorkers,
  damagedLinkSaysSo,
  earned,
  expect,
  linkReplays,
  noSidewaysScroll,
  openPage,
  RUN,
  slowed,
  SOON,
  test,
  textOf,
  watch,
} from "./x";

/** REQ-EXP-04: race to train, and break and repair, each finish a round on one device. */
const READY = "[data-stage=one]";
const game = "[data-game]";
const stage = (page: Page, name: string) =>
  expect(page.locator(game)).toHaveAttribute("data-stage", name, SOON);
const press = (page: Page, name: string) => page.getByRole("button", { name }).click();
const pick = (page: Page, name: string) => page.getByRole("radio", { name }).click();

async function pickTeams(page: Page, first: [string, string], second: [string, string]) {
  for (const name of first) await pick(page, name);
  await press(page, words.hide);
  await stage(page, "pass");
  // Nothing on screen gives the first choice away.
  await expect(page.getByRole("radiogroup", { name: words.race.size })).toHaveCount(0);
  await expect(page.getByText(words.pass(words.players[1]))).toBeVisible();
  await press(page, words.ready);
  for (const name of second) await pick(page, name);
  await press(page, words.hide);
  await stage(page, "play");
}

test("a race to train is won on equal computing, scored once, and played again", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const { errors, elsewhere } = watch(page);
  await openPage(page, "/two-player", READY);
  await pickTeams(
    page,
    [words.race.sizes.middle, words.race.paces.steady],
    [words.race.sizes.small, words.race.paces.careful],
  );
  await press(page, words.race.start);
  await expect(page.locator(game)).toHaveAttribute("data-winner", "0", RUN);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    words.race.won(words.players[0]),
  );
  await expect(page.locator("[data-score]")).toHaveAttribute("data-score", "1-0");
  await earned(page, "race");
  // Nothing goes on after the win.
  const steps = await page.locator(game).getAttribute("data-steps");
  await page.waitForTimeout(700);
  expect(await page.locator(game).getAttribute("data-steps")).toBe(steps);
  await expect(page.getByText(words.term.race)).toBeVisible();

  await press(page, words.again);
  await stage(page, "one");
  await expect(page.locator(game)).not.toHaveAttribute("data-winner");
  await expect(page.locator("[data-score]")).toHaveAttribute("data-score", "1-0");
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("a round started over with the same teams is raced again before it counts", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openPage(page, "/two-player", READY);
  const teams = [
    [words.race.sizes.middle, words.race.paces.steady],
    [words.race.sizes.small, words.race.paces.careful],
  ] as const;
  await pickTeams(page, [...teams[0]], [...teams[1]]);
  await press(page, words.race.start);
  await expect(page.locator(game)).toHaveAttribute("data-winner", "0", RUN);
  await press(page, words.restart);
  await pickTeams(page, [...teams[0]], [...teams[1]]);
  await page.waitForTimeout(500);
  await expect(page.locator(game)).not.toHaveAttribute("data-winner");
  await expect(page.locator("[data-score]")).toHaveAttribute("data-score", "1-0");
  await press(page, words.race.start);
  await expect(page.locator(game)).toHaveAttribute("data-winner", "0", RUN);
  await expect(page.locator("[data-score]")).toHaveAttribute("data-score", "2-0");
});

test("the same team against itself is a tie, and says why", async ({ page }) => {
  test.setTimeout(120_000);
  await openPage(page, "/two-player", READY);
  const same: [string, string] = [words.race.sizes.middle, words.race.paces.steady];
  await pickTeams(page, same, same);
  await press(page, words.race.start);
  await expect(page.locator(game)).toHaveAttribute("data-winner", "tie", RUN);
  await expect(page.getByText(words.race.same, { exact: true })).toBeVisible();
  await expect(page.locator("[data-score]")).toHaveAttribute("data-score", "0-0");
});

/** Cuts three threads and sends two cells to practise, by keyboard alone. */
async function breakAndRepair(page: Page) {
  for (const [cell, which] of [
    [1, 0],
    [3, 1],
    [5, 2],
  ] as const) {
    const button = page.getByRole("button", {
      name: words.mend.break.thread(cell, words.mend.break.threads[which], false),
      exact: true,
    });
    await button.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator("[data-cut]")).toHaveCount(3);
  // A fourth cannot be cut.
  await expect(
    page.getByRole("button", {
      name: words.mend.break.thread(8, words.mend.break.threads[2], false),
      exact: true,
    }),
  ).toBeDisabled();
  await press(page, words.hide);
  await stage(page, "pass");
  await press(page, words.ready);
  await stage(page, "two");
  await expect(page.getByRole("heading", { level: 2 })).toBeFocused();
  for (const cell of [2, 7]) {
    await page.getByRole("button", { name: words.mend.repair.cell(cell), exact: true }).focus();
    await page.keyboard.press("Space");
  }
  await press(page, words.mend.repair.start);
  await stage(page, "play");
}

test("break and repair finishes a round, and the players swap", async ({ page }) => {
  test.setTimeout(150_000);
  await openPage(page, "/two-player", READY);
  await pick(page, words.game.mend);
  await expect(page.locator(game)).toHaveAttribute("data-game", "mend");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    words.mend.break.heading(words.players[0]),
  );
  await breakAndRepair(page);
  await expect(page.locator(game)).toHaveAttribute("data-winner", /[01]/, RUN);
  await earned(page, "mend");
  const winner = await page.locator(game).getAttribute("data-winner");
  await expect(page.locator("[data-score]")).toHaveAttribute(
    "data-score",
    winner === "0" ? "1-0" : "0-1",
  );
  await press(page, words.swap);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    words.mend.break.heading(words.players[1]),
  );
});

test("a link to a finished round shows the same result and counts it once", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  await openPage(page, "/two-player", READY);
  await pick(page, words.game.mend);
  await breakAndRepair(page);
  await expect(page.locator(game)).toHaveAttribute("data-winner", /[01]/, RUN);
  await expect(page.locator("[data-score]")).not.toHaveAttribute("data-score", "0-0");
  await linkReplays(page, context, "/two-player", [
    attributeOf(game, "data-steps"),
    attributeOf(game, "data-winner"),
    attributeOf("[data-mend-right]", "data-mend-right"),
    attributeOf("[data-score]", "data-score"),
    textOf("[data-game] h2"),
  ]);
});

test("both games fit a phone and play by touch, cutting threads on the picture", async ({
  browser,
}) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 700 } }),
  );
  const page = await context.newPage();
  await openPage(page, "/two-player", READY);
  await noSidewaysScroll(page);
  await page.getByRole("radio", { name: words.game.mend }).tap();
  await noSidewaysScroll(page);
  const picture = page.getByRole("img", { name: words.mend.network });
  await picture.scrollIntoViewIfNeeded();
  const box = await picture.boundingBox();
  if (!box) throw new Error("no picture");
  // Along the first cell's thread in: a tap near a thread means that thread.
  for (const along of [0.2, 0.5, 0.8])
    await page.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * along);
  expect(await page.locator("[data-cut]").count()).toBeGreaterThan(0);
  await context.close();
});

test("a damaged link, or a worker that cannot start, says so", async ({ page }) => {
  await damagedLinkSaysSo(page, "/two-player", READY);
  await page.goto("about:blank");
  await breakWorkers(page);
  await openPage(page, "/two-player", READY);
  await pick(page, words.game.mend);
  await expect(page.getByRole("alert").filter({ hasText: shellCaptions.workerFailed })).toBeVisible(
    SOON,
  );
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await press(page, words.restart);
  await expect(page.locator("[data-mend-right]")).not.toHaveAttribute("data-mend-right", "0", SOON);
});

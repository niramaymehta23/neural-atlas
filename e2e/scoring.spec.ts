import { expect, test, type Locator, type Page } from "@playwright/test";
import { watch } from "./watch";

/**
 * H3b hardening of "Scoring every move" (docs/hardening/lessons.md QL-*, LIVE-14): painting a
 * scrubbed-back board, swiping past the board on a phone, walls at night, the new missions and
 * shared links that reproduce the run.
 */
const LESSON = "/learn/scoring-every-move";
/** The kitchen is seven squares wide: square `row * 7 + column`. */
const COLUMNS = 7;

const scene = (page: Page) => page.getByTestId("scoring-every-move");
const square = (page: Page, row: number, column: number) =>
  scene(page)
    .locator("[data-tile]")
    .nth(row * COLUMNS + column);
const tries = async (page: Page) => Number(await scene(page).getAttribute("data-tries"));
const star = (page: Page) => page.locator("[data-region=dock]").getByText("You earned a star.");

async function open(page: Page, hash = "") {
  await page.goto(`${LESSON}${hash}`);
  await expect(scene(page)).toBeVisible({ timeout: 20_000 });
}

async function fullSpeed(page: Page) {
  await page.getByRole("slider", { name: "How fast to play" }).focus();
  await page.keyboard.press("End");
}

async function brush(page: Page, name: string) {
  await page.getByRole("radio", { name }).click();
}

async function practise(page: Page, atLeast: number) {
  await page.getByRole("button", { name: "Let it practise" }).click();
  await expect.poll(() => tries(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(atLeast);
}

async function pause(page: Page) {
  await page
    .locator("[data-region=dock]")
    .getByRole("button", { name: "Pause", exact: true })
    .click();
}

/** Every arrow's length, in board order: two equal lists mean two equal score tables. */
const arrows = (board: Locator) =>
  board
    .locator("[data-arrow]")
    .evaluateAll((all) => all.map((arrow) => arrow.getAttribute("data-reach")));

test("painting while scrubbed back paints the board as it is now (QL-01)", async ({ page }) => {
  const { errors } = watch(page);
  await open(page);
  await fullSpeed(page);
  await practise(page, 20);
  await pause(page);
  const now = await tries(page);

  await page.getByRole("button", { name: "Back one moment" }).click();
  await page.getByRole("button", { name: "Back one moment" }).click();
  await expect.poll(() => tries(page)).toBeLessThan(now);

  await brush(page, "Lava");
  await square(page, 0, 3).click();
  await expect(page.getByRole("button", { name: "Back to now" })).toHaveCount(0);
  await expect.poll(() => tries(page)).toBe(now);
  await expect(square(page, 0, 3)).toHaveAttribute("data-tile", "trap");
  expect(errors).toEqual([]);
});

test("walls are a calm mid tone at night, not a glare (QL-15)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("neural-atlas-theme", "night"));
  await open(page);
  // KITCHEN has walls at row 2, columns 2 and 4.
  const wall = square(page, 2, 2);
  await expect(wall).toHaveAttribute("data-tile", "wall");
  const lightness = await wall.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) return -1;
    const toLightness = (colour: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = colour;
      context.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink-soft");
    return {
      wall: toLightness(getComputedStyle(element).fill),
      inkSoft: toLightness(ink),
    };
  });
  expect(lightness).not.toBe(-1);
  if (lightness === -1) return;
  // Well below the bright soft ink walls used to be, but still apart from the dark floor.
  expect(lightness.wall).toBeLessThan(lightness.inkSoft * 0.7);
  expect(lightness.wall).toBeGreaterThan(0.12);
});

test("a treat beside the start becomes a loophole (QL-03, QL-17)", async ({ page }) => {
  const { errors } = watch(page);
  await open(page, "#mission=find-a-loophole");
  await brush(page, "Treat");
  await square(page, 3, 0).click();
  await expect(square(page, 3, 0)).toHaveAttribute("data-tile", "coin");
  await fullSpeed(page);
  await page.getByRole("button", { name: "Let it practise" }).click();
  await expect(star(page)).toBeVisible({ timeout: 45_000 });
  expect(errors).toEqual([]);
});

test("a bowl sealed off by lava says so, and is a maze it can't solve (QL-05, QL-17)", async ({
  page,
}) => {
  const { errors } = watch(page);
  await open(page, "#mission=no-way-through");
  await brush(page, "Lava");
  await square(page, 3, 6).click();
  await brush(page, "Wall");
  await square(page, 2, 6).click();
  await expect(scene(page).locator("[data-bowl=blocked]")).toHaveText(/The bowl can’t be reached/);
  await practise(page, 1);
  await expect(star(page)).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test("a shared link replays the same run to the same moment (QL-07)", async ({ page, context }) => {
  const { errors } = watch(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await fullSpeed(page);
  await page.getByRole("button", { name: "Let it practise" }).click();
  await expect.poll(() => tries(page), { timeout: 30_000 }).toBeGreaterThan(10);
  // Changed mid-run: the link must replay this at the move it happened.
  await square(page, 0, 0).click();
  await page.getByRole("slider", { name: "How fast it learns" }).focus();
  await page.keyboard.press("PageUp");
  await expect.poll(() => tries(page), { timeout: 30_000 }).toBeGreaterThan(60);
  await pause(page);
  const made = await tries(page);
  const drawn = await arrows(scene(page));
  expect(drawn.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  // The link is compressed before it reaches the clipboard.
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("#s=");
  const link = await page.evaluate(() => navigator.clipboard.readText());

  const other = await context.newPage();
  await other.goto(link);
  await expect(scene(other)).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => tries(other)).toBe(made);
  await expect(square(other, 0, 0)).toHaveAttribute("data-tile", "wall");
  expect(await arrows(scene(other))).toEqual(drawn);
  expect(errors).toEqual([]);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("a swipe across the board scrolls the page and paints nothing (QL-14)", async ({ page }) => {
    await open(page);
    const board = scene(page).getByRole("application");
    await board.scrollIntoViewIfNeeded();
    const painted = () => scene(page).locator('[data-tile="wall"]').count();
    const walls = await painted();
    const box = await board.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.8;
    const before = await page.evaluate(() => window.scrollY);

    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", at: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y: at }],
      });
    await touch("touchStart", y);
    for (let step = 1; step <= 8; step += 1) await touch("touchMove", y - step * 25);
    await touch("touchEnd", y - 200);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    expect(await painted()).toBe(walls);
  });

  test("a tap still paints one square", async ({ page }) => {
    await open(page);
    await square(page, 0, 1).tap();
    await expect(square(page, 0, 1)).toHaveAttribute("data-tile", "wall");
  });
});

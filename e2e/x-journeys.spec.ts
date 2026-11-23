import { lessonById } from "../src/catalog";
import { journeyCaptions as words } from "../src/experiences/journeys/captions";
import { journeyById, journeys } from "../src/experiences/journeys/journeys";
import { shellCaptions } from "../src/experiences/shell/captions";
import { platformCaptions } from "../src/platform/captions";
import { earned, expect, noSidewaysScroll, openPage, slowed, SOON, test, watch } from "./x";

/** REQ-EXP-02: "How ChatGPT works" plays end to end through the lessons themselves. */
const chat = journeyById("how-chatgpt-works");
if (!chat) throw new Error("no such journey");
const path = `/journeys/${chat.id}`;

test("How ChatGPT works plays from the first stop to the last", async ({ page }) => {
  test.setTimeout(240_000);
  const { errors, elsewhere } = watch(page);
  await openPage(page, "/journeys", "h1");
  await page.getByRole("link", { name: `${words.begin}: ${chat.title}` }).click();
  for (const [at, { lesson, words: told }] of chat.stops.entries()) {
    await expect(page.locator("[data-stop]")).toHaveAttribute("data-stop", `${at + 1}`, SOON);
    await expect(
      page.getByRole("heading", { level: 2, name: lessonById(lesson)?.title }),
    ).toBeVisible();
    await expect(page.getByText(told)).toBeVisible();
    // The lesson's own scene is on stage, and did not break.
    const stage = page.locator(`[data-lesson="${lesson}"]`);
    await expect(stage.locator("[data-region=stage] [data-testid]").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(stage.getByText(platformCaptions.problem.title)).toHaveCount(0);
    if (at < chat.stops.length - 1) await page.getByRole("button", { name: words.next }).click();
  }
  await expect(page.getByText(words.arrived)).toBeVisible();
  await expect(page.getByText(chat.end)).toBeVisible();
  await earned(page, "journey");
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("every journey opens, and its stops can be reached by keyboard", async ({ page }) => {
  for (const { id, title, stops } of journeys) {
    await openPage(page, `/journeys/${id}`, "[data-stop='1']");
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    const last = page.getByRole("navigation", { name: words.map }).getByRole("button").last();
    await last.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-stop]")).toHaveAttribute("data-stop", `${stops.length}`);
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeFocused();
  }
});

test("a link lands on its stop, and Back goes back a stop", async ({ page }) => {
  await openPage(page, `${path}#stop=3`, "[data-stop='3']");
  await page.getByRole("button", { name: words.next }).click();
  await expect(page.locator("[data-stop]")).toHaveAttribute("data-stop", "4");
  await page.goBack();
  await expect(page.locator("[data-stop]")).toHaveAttribute("data-stop", "3");
  await page.goForward();
  await expect(page.locator("[data-stop]")).toHaveAttribute("data-stop", "4");
  // A stop that does not exist is the nearest one that does.
  await page.goto("about:blank");
  await openPage(page, `${path}#stop=999`, `[data-stop='${chat.stops.length}']`);
});

test("a stop's lesson is played on the spot, by touch, on a phone", async ({ browser }) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 700 } }),
  );
  const page = await context.newPage();
  await openPage(page, `${path}#stop=7`, "[data-lesson='guess-the-next-word']");
  const scene = page.locator("[data-region=stage] [data-testid]").first();
  await expect(scene).toBeVisible({ timeout: 30_000 });
  await noSidewaysScroll(page);
  await page.getByRole("button", { name: words.next }).tap();
  await expect(page.locator("[data-stop]")).toHaveAttribute("data-stop", "8");
  await context.close();
});

test("a stop whose lesson cannot be fetched says so, and tries again", async ({ page }) => {
  await openPage(page, path, "[data-stop='1']");
  await expect(page.locator("[data-region=stage] [data-testid]").first()).toBeVisible(SOON);
  await page.waitForLoadState("networkidle");
  // Every script asked for from here on is lost.
  await page.route(/\.js$/, (route) => route.abort());
  await page.getByRole("navigation", { name: words.map }).getByRole("button").nth(9).click();
  await expect(page.getByRole("alert").filter({ hasText: shellCaptions.lessonFailed })).toBeVisible(
    { timeout: 30_000 },
  );
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.getByRole("button", { name: platformCaptions.problem.retry }).click();
  await expect(page.locator("[data-region=stage] [data-testid]").first()).toBeVisible(SOON);
});

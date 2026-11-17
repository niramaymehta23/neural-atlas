import { expect, test, type Page } from "@playwright/test";
import { builtPath } from "./built";
import { watch } from "./watch";

const STORY = "Small steps settle the ball at the bottom; big ones overshoot.";

const watchErrors = (page: Page) => watch(page).errors;

async function openFixture(page: Page, hash = "") {
  await page.goto(`/styleguide/platform${hash}`);
  await expect(page.getByRole("heading", { name: "A ball in a valley" })).toBeVisible();
}

const dial = (page: Page) => page.getByRole("slider", { name: "How big a step" });
const takeSteps = async (page: Page, times: number) => {
  for (let i = 0; i < times; i += 1)
    await page.getByRole("button", { name: "Take a step" }).click();
};

test("the shell lays out every region, with the caption after the first touch", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await openFixture(page);
  await expect(page.getByText(/A ball sits on the side of a valley/)).toBeVisible();
  const dock = page.locator("[data-region=dock]");
  await expect(dock.getByRole("region", { name: "Mission" })).toContainText("flies off");
  await expect(dock.getByRole("region", { name: "Make a guess" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Peek under the hood" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.getByText(STORY)).toHaveCount(0);
  await expect(page.getByText("gradient descent")).toHaveCount(0);

  // The dial dock sits beside the scene on a desktop.
  const scene = await page.locator("[data-region=scene]").boundingBox();
  const dockBox = await dock.boundingBox();
  expect(dockBox!.x).toBeGreaterThan(scene!.x + scene!.width - 1);

  await dial(page).focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByText(STORY)).toBeVisible();

  await page.getByRole("switch", { name: "Compare side by side" }).click();
  await expect(
    page.getByRole("separator", { name: "Compare your step with a small one" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("stacks the cards in one column on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page);
  const scene = await page.locator("[data-region=scene]").boundingBox();
  const dock = await page.locator("[data-region=dock]").boundingBox();
  expect(dock!.y).toBeGreaterThanOrEqual(scene!.y + scene!.height);
  expect(Math.abs(dock!.x - scene!.x)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("the timeline scrubs the recorded steps", async ({ page }) => {
  await openFixture(page);
  await takeSteps(page, 4);
  const moment = page.getByRole("slider", { name: "Moment" });
  await expect(moment).toHaveAttribute("aria-valuetext", "Moment five of five");
  await page.getByRole("button", { name: "Back one moment" }).click();
  await page.getByRole("button", { name: "Back one moment" }).click();
  await expect(moment).toHaveAttribute("aria-valuetext", "Moment three of five");
});

test("a mission fires once, replays its window, and its star survives a reload", async ({
  page,
}) => {
  await openFixture(page);
  await dial(page).focus();
  await page.keyboard.press("End");
  await takeSteps(page, 4);
  const dock = page.locator("[data-region=dock]");
  await expect(dock.getByText("You earned a star.")).toHaveCount(1);
  await expect(page.getByText("gradient descent")).toBeVisible();

  await page.getByRole("button", { name: "Watch why it happened" }).click();
  const moment = page.getByRole("slider", { name: "Moment" });
  await expect(moment).toHaveAttribute("aria-valuetext", /Moment (one|two|three|four) of/);
  // The window ends where it fired (the first huge step already lands past the rim), then the
  // timeline goes back to following live, as it was before the replay (PLT-19).
  await expect(moment).toHaveAttribute("aria-valuetext", "Moment five of five");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

  await page.reload();
  await expect(page.locator("[data-mission=fly-off]")).toHaveAttribute("data-done", "true");
  await expect(dock.getByText("You earned a star.")).toHaveCount(0);
  await expect(page.getByText("gradient descent")).toBeVisible();
});

test("a snapshot link restores the exact view", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openFixture(page);
  await dial(page).focus();
  for (let i = 0; i < 10; i += 1) await page.keyboard.press("ArrowUp");
  await page.getByRole("button", { name: "At the bottom" }).click();
  await takeSteps(page, 3);
  await page.getByRole("button", { name: "Back one moment" }).click();
  const value = await dial(page).getAttribute("aria-valuenow");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();
  const link = page.url();
  expect(link).toMatch(/#s=[\w-]+$/);

  const fresh = await context.newPage();
  await openFixture(fresh, new URL(link).hash);
  await expect(dial(fresh)).toHaveAttribute("aria-valuenow", value!);
  // Their guess is shown as theirs; the learner's own guesses start empty (PLT-08).
  await expect(fresh.getByText("Their guess: At the bottom")).toBeVisible();
  await expect(fresh.getByRole("button", { name: "At the bottom" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    "Moment three of four",
  );
  await expect(fresh.getByText(STORY)).toBeVisible();
});

test("the companion model survives navigation and reload", async ({ page }) => {
  await openFixture(page);
  const layers = page.getByTestId("companion-layers");
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(layers).toHaveAttribute("data-layers", "1");
  await page.getByRole("button", { name: "Add a layer" }).click();
  await expect(layers).toHaveAttribute("data-layers", "2");

  await expect(layers).toHaveAttribute("data-saving", "false");
  await page.goto("/learn/teach-by-showing");
  await page.goBack();
  await expect(layers).toHaveAttribute("data-layers", "2");
  await page.reload();
  await expect(layers).toHaveAttribute("data-layers", "2");
});

test("an unbuilt lesson shows its locked page", async ({ page }) => {
  await page.goto("/learn/keeping-score-of-mistakes");
  await expect(page.getByRole("heading", { name: "Keeping score of mistakes" })).toBeVisible();
  await expect(page.getByText("Still being drawn")).toBeVisible();
  await expect(page.getByText('One score for "how wrong"')).toBeVisible();
  await expect(page.getByText("Loss function")).toHaveCount(0);
  await page.getByRole("link", { name: "Drawing the best line" }).click();
  await expect(page).toHaveURL(/\/learn\/drawing-the-best-line$/);
});

test("the palette jumps to a lesson by its real term", async ({ page }) => {
  await page.goto("/learn/teach-by-showing");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox").fill("attention");
  await page.getByRole("option", { name: /Who is looking at whom/ }).click();
  await expect(page).toHaveURL(/\/learn\/who-is-looking-at-whom$/);
});

test("the daily puzzle picks today's mission from a built lesson", async ({ page }) => {
  await openFixture(page);
  const puzzle = page.getByTestId("fixture-puzzle");
  await expect(puzzle.getByText("Take steps so big the ball flies off")).toBeVisible();
  await expect(puzzle.getByRole("link", { name: "Try it" })).toHaveAttribute(
    "href",
    "/learn/fixture-valley#mission=fly-off",
  );

  await page.goto("/puzzle");
  const link = page.getByRole("link", { name: "Try it" });
  await expect(link).toHaveAttribute("href", builtPath("#mission="));
  await link.click();
  await expect(page.locator("[data-region=scene]")).toBeVisible();
});

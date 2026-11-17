import { expect, test, type Locator, type Page } from "@playwright/test";
import { watch } from "./watch";

/**
 * H3a hardening of Rolling downhill (DH-01..08). Wording comes from
 * src/modules/w1-foundations/rolling-downhill/captions.ts.
 */
const dock = (page: Page) => page.locator("[data-region=dock]");
const stage = (page: Page) => page.locator("[data-valley-stage]");

async function open(page: Page) {
  await page.goto("/learn/rolling-downhill");
  await expect(stage(page).locator("canvas")).toBeVisible({ timeout: 20_000 });
  // The surface is drawn on demand; give it a frame or two.
  await page.waitForTimeout(500);
}

type Kind = "black" | "ivory" | "sage";

/** How many pixels of the 3D view look like each walker's colour, from a real screenshot. */
async function walkerPixels(page: Page, view: Locator): Promise<Record<Kind, number>> {
  const png = (await view.screenshot()).toString("base64");
  return page.evaluate(async (data) => {
    const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const { data: pixels } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    const counts = { black: 0, ivory: 0, sage: 0 };
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
      const [high, low] = [Math.max(r, g, b), Math.min(r, g, b)];
      if (high < 45) counts.black += 1;
      else if (low > 150 && high - low < 25) counts.ivory += 1;
      else if (g > r + 15 && g > b + 15) counts.sage += 1;
    }
    return counts;
  }, png);
}

test("all three walkers show at the start, apart and in their own colours (DH-08)", async ({
  page,
}) => {
  const { errors } = watch(page);
  await open(page);
  const view = stage(page).locator("canvas");
  // Day: the dark walker and the green one stand out from the light page.
  const day = await walkerPixels(page, view);
  expect(day.black).toBeGreaterThan(20);
  expect(day.sage).toBeGreaterThan(20);
  // Night: the light walker stands out from the dark page.
  await page
    .getByRole("radiogroup", { name: "Page colour" })
    .getByRole("radio", { name: "Night" })
    .click();
  await page.waitForTimeout(500);
  expect((await walkerPixels(page, view)).ivory).toBeGreaterThan(20);
  await test.info().attach("walkers at the start", {
    body: await view.screenshot(),
    contentType: "image/png",
  });
  expect(errors).toEqual([]);
});

test("the valley can be turned by dragging (DH-07)", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Turn the valley" }).click();
  await expect(page.getByText("Drag the valley to turn it.", { exact: false })).toBeVisible();
  const box = (await stage(page).locator("canvas").boundingBox())!;
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  // The turning handle is attached on the 3D view's next frame: drag until it turns.
  await expect(async () => {
    await page.mouse.move(middle.x, middle.y);
    await page.mouse.down();
    for (let step = 1; step <= 10; step += 1) await page.mouse.move(middle.x + step * 20, middle.y);
    await page.mouse.up();
    expect(Math.abs(Number(await stage(page).getAttribute("data-azimuth")))).toBeGreaterThan(0.2);
  }).toPass({ timeout: 10_000 });
  // Turning does not drop the walkers.
  await expect(dock(page).getByRole("button", { name: "Let them roll" })).toBeVisible();
});

test("the fly-off replay plays slowly, for at least two seconds (DH-07)", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "How big a step" }).focus();
  await page.keyboard.press("End");
  await dock(page).getByRole("button", { name: "Let them roll" }).click();
  await expect(dock(page).getByText("You earned a star.")).toBeVisible();
  // Let the roll itself finish playing first.
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Watch why it happened" }).click();
  const started = Date.now();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 10_000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(2_000);
});

test("guesses go on the valley before the roll and are judged after it (DH-02)", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("radio", { name: "Guess where they stop" }).click();
  await expect(page.getByText("Tap where you think the steady walker will stop.")).toBeVisible();
  const box = (await stage(page).locator("canvas").boundingBox())!;
  for (const [x, y] of [
    [0.45, 0.55],
    [0.5, 0.5],
    [0.55, 0.45],
  ] as const) {
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
  }
  await expect(page.getByText(/Your three guesses are in/)).toBeVisible();
  await dock(page).getByRole("button", { name: "Let them roll" }).click();
  await expect(page.locator("[data-walker]").filter({ hasText: /your guess/ })).toHaveCount(3, {
    timeout: 15_000,
  });
});

test("a link opens on the same roll (DH-01)", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("radio", { name: "Mountain pass" }).click();
  await dock(page).getByRole("button", { name: "Let them roll" }).click();
  await expect(dock(page).getByRole("button", { name: "Roll again" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 10_000 });
  const moment = page.getByRole("slider", { name: "Moment" });
  const ended = await moment.getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/rolling-downhill${new URL(page.url()).hash}`);
  await expect(fresh.getByRole("radio", { name: "Mountain pass" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(fresh.getByRole("slider", { name: "Moment" })).toHaveAttribute(
    "aria-valuetext",
    ended!,
  );
});

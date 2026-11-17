import { expect, test, type Page } from "@playwright/test";
import { expectSmooth, measureFrames, settle } from "./frames";
import { watch } from "./watch";

/**
 * H3a hardening of Stacking cells (MLP-01..10). Wording comes from
 * src/modules/w3-neural-networks/stacking-cells/captions.ts.
 */
const scene = (page: Page) => page.getByTestId("stacking-cells");
const dock = (page: Page) => page.locator("[data-region=dock]");
const garden = (page: Page) =>
  page.getByRole("application", { name: "Garden: tap or drag to plant flowers" });
const star = (page: Page) => dock(page).getByText("You earned a star.");
const learn = (page: Page) => dock(page).getByRole("button", { name: "Let it learn" });

async function open(page: Page, hash = "") {
  await page.goto(`/learn/stacking-cells${hash}`);
  await expect(scene(page)).toBeVisible({ timeout: 20_000 });
  const skip = page.getByRole("button", { name: "Skip the guess for now" });
  if (await skip.isVisible()) await skip.click();
}

async function setDial(page: Page, name: string, value: number) {
  const dial = page.getByRole("slider", { name });
  await dial.focus();
  await page.keyboard.press("Home");
  const min = Number(await dial.getAttribute("aria-valuemin"));
  for (let at = min; at < value; at += 1) await page.keyboard.press("ArrowUp");
  await expect(dial).toHaveAttribute("aria-valuenow", String(value));
}

/** The decision field's pixels, as one string, so two views can be compared exactly. */
function fieldPixels(page: Page) {
  return garden(page)
    .locator("canvas")
    .first()
    .evaluate((canvas: HTMLCanvasElement) => {
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      let painted = 0;
      let hash = 0;
      for (let i = 0; i < data.length; i += 1) {
        hash = (hash * 31 + data[i]!) | 0;
        if (i % 4 === 3 && data[i]! > 0) painted += 1;
      }
      return { painted, hash };
    });
}

test.describe("missions (MLP-07, MLP-09)", () => {
  test("one cell cannot fence in the spiral", async ({ page }) => {
    await open(page);
    await scene(page).getByRole("button", { name: "A spiral" }).click();
    await setDial(page, "How many layers", 1);
    await setDial(page, "Cells in each layer", 1);
    await learn(page).click();
    await expect(star(page)).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("[data-mission=spiral-one-cell]")).toHaveAttribute(
      "data-done",
      "true",
    );
  });

  test("a handful of cells fences in the spiral", async ({ page }) => {
    await open(page);
    await scene(page).getByRole("button", { name: "A spiral" }).click();
    await setDial(page, "How many layers", 1);
    await setDial(page, "Cells in each layer", 8);
    await learn(page).click();
    await expect(star(page)).toBeVisible({ timeout: 90_000 });
  });

  test("a big team learns five flowers by heart", async ({ page }) => {
    await open(page);
    await scene(page).getByRole("button", { name: "An empty garden" }).click();
    // Choosing a brush can scroll the page, so the garden is measured for every flower.
    const plantAt = async (x: number, y: number) => {
      await garden(page).scrollIntoViewIfNeeded();
      const box = (await garden(page).boundingBox())!;
      await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
    };
    await page.getByRole("radio", { name: "Daisies" }).click();
    await plantAt(0.2, 0.3);
    await plantAt(0.7, 0.7);
    await page.getByRole("radio", { name: "Tulips" }).click();
    await plantAt(0.25, 0.75);
    await plantAt(0.75, 0.25);
    await plantAt(0.5, 0.5);
    await setDial(page, "How many layers", 2);
    await setDial(page, "Cells in each layer", 8);
    await learn(page).click();
    await expect(star(page)).toBeVisible({ timeout: 60_000 });
  });

  test("huge steps send a whole layer of cut-off cells quiet", async ({ page }) => {
    await open(page);
    await scene(page).getByRole("button", { name: "A spiral" }).click();
    await setDial(page, "How many layers", 4);
    await setDial(page, "Cells in each layer", 4);
    for (const layer of ["one", "two", "three", "four"])
      await page.getByLabel(`How layer ${layer} bends`).selectOption("relu");
    await page.getByRole("slider", { name: "How big a step" }).focus();
    await page.keyboard.press("End");
    await learn(page).click();
    await expect(star(page)).toBeVisible({ timeout: 30_000 });
  });
});

test("an empty garden keeps “Let it learn” off, with the reason (MLP-03)", async ({ page }) => {
  await open(page);
  await scene(page).getByRole("button", { name: "An empty garden" }).click();
  await expect(learn(page)).toBeDisabled();
  await expect(dock(page).getByText("Plant some flowers of both kinds first.")).toBeVisible();
});

test("the fences are drawn before any practice (MLP-08)", async ({ page }) => {
  await open(page);
  await expect.poll(async () => (await fieldPixels(page)).painted).toBeGreaterThan(100);
});

test("pointing at a cell shows the fence it draws on its own (MLP-07)", async ({ page }) => {
  await open(page);
  await page.locator("[data-hidden-cell]").first().hover();
  await expect(page.locator("[data-own-fence]")).toBeVisible();
});

test("a full garden stops planting at its cap (MLP-04)", async ({ page }) => {
  await open(page);
  // 398 flowers in a link, then a few more planted by keyboard.
  const points = Array.from({ length: 398 }, (_, i) => ({
    x: Math.round(((i % 20) / 10 - 0.95) * 100) / 100,
    y: Math.round((Math.floor(i / 20) / 10 - 0.95) * 100) / 100,
    label: i % 2,
  }));
  const link = await page.evaluate(
    async (text) => {
      const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    },
    JSON.stringify({
      v: 2,
      id: "stacking-cells",
      state: { garden: "own", points },
      guesses: {},
      touched: true,
      momentEpoch: null,
    }),
  );
  await page.goto("/styleguide"); // a hash change alone does not reopen a lesson
  await open(page, `#s=${link}`);
  await garden(page).focus();
  for (let i = 0; i < 6; i += 1) await page.keyboard.press("Enter");
  await expect(page.locator("[data-notice=full]")).toBeVisible();
  await expect(page.locator("[data-notice=full]")).toHaveText(
    "The garden is full. Pull some flowers up to plant more.",
  );
});

test("a link opens on exactly the same fences (MLP-09, ENG-09)", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await learn(page).click();
  await expect
    .poll(async () => Number(await scene(page).getAttribute("data-epoch")))
    .toBeGreaterThan(60);
  await dock(page).getByRole("button", { name: "Pause" }).click();
  // Practice already on its way when paused still lands: wait until the count rests.
  let epoch = "";
  await expect(async () => {
    const seen = await scene(page).getAttribute("data-epoch");
    await page.waitForTimeout(400);
    expect(await scene(page).getAttribute("data-epoch")).toBe(seen);
    epoch = seen ?? "";
  }).toPass();
  const before = await fieldPixels(page);
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await open(fresh, new URL(page.url()).hash);
  await expect(scene(fresh)).toHaveAttribute("data-epoch", epoch, { timeout: 30_000 });
  await expect(fresh.locator("[data-replaying]")).toHaveCount(0);
  await expect.poll(async () => (await fieldPixels(fresh)).hash).toBe(before.hash);
});

test(
  "stacking cells: the biggest team still draws at 60 fps while it learns (MLP-01)",
  { tag: "@perf" },
  async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "frame timing");
    const { errors } = watch(page);
    await open(page);
    await setDial(page, "How many layers", 4);
    await setDial(page, "Cells in each layer", 8);
    await settle(page);
    const idle = await measureFrames(page, 3);
    await learn(page).click();
    await expect
      .poll(async () => Number(await scene(page).getAttribute("data-epoch")))
      .toBeGreaterThan(20);
    await settle(page);
    const before = Number(await scene(page).getAttribute("data-epoch"));
    expectSmooth(idle, await measureFrames(page, 3));
    expect(Number(await scene(page).getAttribute("data-epoch"))).toBeGreaterThan(before);
    expect(errors).toEqual([]);
  },
);

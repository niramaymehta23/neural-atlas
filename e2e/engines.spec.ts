import { chromium, expect, test, type Page } from "@playwright/test";
import { expectSixtyFps, frameGaps, settle } from "./frames";

const lab = (page: Page) => page.getByTestId("training-lab");
const epochOf = async (page: Page) => Number(await lab(page).getAttribute("data-epoch"));

async function openLab(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/styleguide/engines");
  await expect(lab(page)).toHaveAttribute("data-backend", "autodiff");
  return errors;
}

// Frame timing is the measurement, so these run one at a time.
test.describe.configure({ mode: "serial" });

test("holds 60 fps while a spiral network trains in the worker (trace saved)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Chrome tracing");
  const errors = await openLab(page);
  expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
  await page.getByRole("button", { name: "Practise" }).click();
  await expect.poll(() => epochOf(page)).toBeGreaterThan(4);
  await settle(page);

  const browser = page.context().browser() ?? (await chromium.launch());
  await browser.startTracing(page, {
    path: "test-results/engines-training-trace.json",
    categories: ["devtools.timeline", "disabled-by-default-devtools.timeline.frame"],
  });
  const before = await epochOf(page);
  const gaps = await frameGaps(page, 3);
  await browser.stopTracing();
  expectSixtyFps(gaps);
  expect(await epochOf(page)).toBeGreaterThan(before + 10); // it really trained meanwhile

  // The field keeps redrawing within a frame budget.
  const paints = await page.evaluate(() =>
    performance.getEntriesByName("decision-field-paint").map(({ duration }) => duration),
  );
  expect(paints.length).toBeGreaterThan(3);
  expect(Math.max(...paints)).toBeLessThan(16);
  test.info().annotations.push({
    type: "field",
    description: `${paints.length} redraws of 128², slowest ${Math.max(...paints).toFixed(2)} ms`,
  });
  expect(errors).toEqual([]);
});

test("scrubs back to a recorded moment, replays it, and races a ghost", async ({ page }) => {
  const errors = await openLab(page);
  await page.getByRole("button", { name: "Practise" }).click();
  await expect.poll(() => epochOf(page)).toBeGreaterThan(30);

  // Scrubbing while it practises pauses it first, so the recording never rewinds.
  const moment = page.getByRole("slider", { name: "Moment" });
  await moment.focus();
  await page.keyboard.press("Home");
  await expect(lab(page)).toHaveAttribute("data-live", "false");
  await expect(lab(page)).toHaveAttribute("data-epoch", "2");
  await expect(moment).toHaveAttribute("aria-valuetext", /^Moment one of /);
  await page.keyboard.press("ArrowRight");
  await expect(lab(page)).toHaveAttribute("data-epoch", "4");

  await expect(page.getByRole("button", { name: "Practise" })).toBeVisible();

  await page.getByRole("button", { name: "Play" }).click();
  await expect.poll(() => epochOf(page)).toBeGreaterThan(10);

  // Practise again carries on from the newest moment: recorded epochs only ever go up.
  const newest = Number(await moment.getAttribute("aria-valuemax")) + 1;
  await page.getByRole("button", { name: "Practise" }).click();
  await expect.poll(() => epochOf(page)).toBeGreaterThan(newest * 2 + 4);
  await page.getByRole("button", { name: "Pause" }).click();
  await moment.focus();
  await page.keyboard.press("Home");
  const recorded: number[] = [];
  for (let step = 0; step < newest + 4; step += 1) {
    recorded.push(await epochOf(page));
    await page.keyboard.press("ArrowRight");
  }
  expect(recorded.every((epoch, i) => i === 0 || epoch > recorded[i - 1]!)).toBe(true);

  await page.getByRole("button", { name: "Start a new try" }).click();
  await expect(page.locator("svg[aria-label^='Mistakes'] path[stroke-dasharray]")).toHaveAttribute(
    "d",
    /L/,
  );
  expect(errors).toEqual([]);
});

test("draws 200 changing connections with flowing dots at 60 fps", async ({ page }) => {
  await page.goto("/styleguide/engines");
  const view = page.getByTestId("wiggle-network");
  await expect(view.locator("line")).toHaveCount(200);
  await view.getByRole("switch", { name: "Wiggle every connection" }).click();
  await view.scrollIntoViewIfNeeded();
  const first = await view.locator("line").first().getAttribute("stroke-width");
  await settle(page);
  expectSixtyFps(await frameGaps(page, 3));
  expect(await view.locator("line").first().getAttribute("stroke-width")).not.toBe(first);
});

test("trains with TensorFlow.js in the worker on the best device it finds", async ({ page }) => {
  const errors = await openLab(page);
  await page.getByRole("radio", { name: "Big-model" }).click();
  await expect(lab(page)).toHaveAttribute("data-backend", /^tfjs-(webgpu|webgl|cpu)$/, {
    timeout: 20_000,
  });
  test.info().annotations.push({
    type: "tfjs",
    description: (await lab(page).getAttribute("data-backend")) ?? "",
  });
  await page.getByRole("button", { name: "Practise" }).click();
  await expect.poll(() => epochOf(page), { timeout: 20_000 }).toBeGreaterThan(4);
  expect(errors.filter((error) => !/webgpu|adapter/i.test(error))).toEqual([]);
});

test("shows the board and both 3D scenes without errors, and nothing glows", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/styleguide/engines");
  await expect(page.getByRole("img", { name: /small garden/ })).toBeVisible();
  for (const name of [/valley of mistakes/, /families of ideas/]) {
    const scene = page.getByRole("img", { name });
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("canvas")).toBeVisible();
  }
  await page.getByRole("button", { name: "Glide to one idea" }).click();
  await expect(page.getByRole("button", { name: "Back to the whole map" })).toBeVisible();
  const filters = await page.evaluate(() =>
    [...document.querySelectorAll("*")].map((el) => getComputedStyle(el).filter),
  );
  expect(filters.every((filter) => filter === "none")).toBe(true);
  await page.screenshot({ path: "test-results/engines.png", fullPage: true });
  expect(errors).toEqual([]);
});

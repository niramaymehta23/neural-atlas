import { expect, test } from "@playwright/test";

test("a click on the dial's arc sets its value, no drag needed (A11Y-09)", async ({ page }) => {
  await page.goto("/styleguide");
  const dial = page.getByRole("slider", { name: "How big a step" });
  await dial.scrollIntoViewIfNeeded();
  const box = await dial.boundingBox();
  if (!box) throw new Error("dial not laid out");
  // 3 o'clock on the arc is five-sixths of the way round.
  await page.mouse.click(box.x + box.width - 3, box.y + box.height / 2);
  await expect(dial).toHaveAttribute("aria-valuenow", /^0\.8/);
});

test.describe("on a touch phone", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("a tap opens a hover note (A11Y-20)", async ({ page }) => {
    await page.goto("/styleguide");
    await page.getByRole("button", { name: "A neuron" }).tap();
    await expect(page.getByRole("tooltip")).toContainText("one tiny voter");
  });
});

test("the styleguide does not scroll sideways at 320px (A11Y-16)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/styleguide");
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});

test("the valley shows a still map when WebGL is unavailable (ENG-12)", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...rest: unknown[]
    ) {
      if (kind.startsWith("webgl")) return null;
      return (original as (...args: unknown[]) => unknown).call(this, kind, ...rest);
    } as typeof original;
  });
  await page.goto("/learn/rolling-downhill");
  await expect(page.locator("[data-valley-map]")).toBeVisible();
  // The keyboard drop spot still starts a run.
  await page.getByRole("application", { name: "Choose where to drop the walkers" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-valley-map] [data-marker]").first()).toBeVisible();
});

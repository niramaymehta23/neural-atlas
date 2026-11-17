import { expect, test, type Page } from "@playwright/test";
import { budget, recordPerf } from "./frames";
import { watch } from "./watch";

// The stars float, so their links never hold still: pointer actions skip the stability wait.
const steady = { force: true } as const;

async function openHome(page: Page): Promise<string[]> {
  const { errors } = watch(page);
  await page.goto("/");
  await expect(page.locator("[data-star]")).toHaveCount(74);
  return errors;
}

test("the home map shows all 74 ideas and a paper label on hover", async ({ page }) => {
  const errors = await openHome(page);
  await expect(page.getByRole("heading", { name: "Neural Atlas" })).toBeVisible();
  await expect(page.getByRole("img", { name: /A map of every idea/ })).toBeVisible();

  await page.getByRole("link", { name: "Rolling downhill" }).hover(steady);
  const label = page.getByRole("tooltip");
  await expect(label).toContainText("Rolling downhill");
  await expect(label).toContainText("Learning is walking downhill in a valley of mistakes");
  await page.mouse.move(0, 0);
  await expect(label).toBeHidden();

  // Keyboard reaches the same label.
  await page.getByRole("link", { name: "Teach by showing" }).focus();
  await expect(page.getByRole("tooltip")).toContainText("Show lots of examples");
  expect(errors).toEqual([]);
});

test("the world filter keeps one group to choose from", async ({ page }) => {
  await openHome(page);
  await page.getByRole("radio", { name: "Learning by trying" }).click();
  await expect(page.locator("[data-star]")).toHaveCount(14);
  await page.getByRole("radio", { name: "All ideas" }).click();
  await expect(page.locator("[data-star]")).toHaveCount(74);
});

test(
  "clicking an idea glides for about 1.1 s, then opens its lesson",
  {
    tag: "@perf",
  },
  async ({ page }) => {
    await openHome(page);
    // Marks in the page: the glide runs from the map taking the click to the route change, and the
    // lesson then loads separately.
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) throw new Error("no main");
      new MutationObserver((_, observer) => {
        if (!main.hasAttribute("data-leaving")) return;
        performance.mark("flight-start");
        observer.disconnect();
      }).observe(main, { attributes: true, attributeFilter: ["data-leaving"] });
      const push = history.pushState;
      history.pushState = function (...args: Parameters<History["pushState"]>) {
        performance.mark("flight-landed");
        history.pushState = push;
        return push.apply(this, args);
      };
    });
    await page.getByRole("link", { name: "Drawing the best line" }).click(steady);
    await expect(page.getByRole("main")).toHaveAttribute("data-leaving", "fly");
    await page.waitForURL("**/learn/drawing-the-best-line");
    await expect(page.getByRole("heading", { name: "Drawing the best line" })).toBeVisible({
      timeout: 10_000,
    });
    const { glide, lesson } = await page.evaluate(() => {
      const at = (name: string) => performance.getEntriesByName(name)[0]?.startTime ?? NaN;
      return {
        glide: at("flight-landed") - at("flight-start"),
        lesson: performance.now() - at("flight-landed"),
      };
    });
    test.info().annotations.push({
      type: "flight",
      description: `glide ${Math.round(glide)} ms, lesson ${Math.round(lesson)} ms`,
    });
    recordPerf({ glideMs: glide, lessonMs: lesson });
    // The glide is 1.1 s (motion.test.ts): ±0.3 s on reference hardware; a stuck flight anywhere.
    budget("glide (ms)", Math.abs(glide - 1100), 300);
    expect(glide).toBeLessThan(3000);
    expect(lesson).toBeLessThan(10_000);
  },
);

test("under reduced motion the camera stays and the map fades across", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page);
  // Track the map's lowest opacity until the lesson opens (the page swap keeps this window).
  await page.evaluate(() => {
    const watch = window as typeof window & { lowest?: number };
    watch.lowest = 1;
    const sample = () => {
      const main = document.querySelector("main[data-leaving]");
      if (main) watch.lowest = Math.min(watch.lowest ?? 1, Number(getComputedStyle(main).opacity));
      if (!location.pathname.startsWith("/learn")) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const started = Date.now();
  await page.getByRole("link", { name: "Drawing the best line" }).click(steady);
  await expect(page.getByRole("main")).toHaveAttribute("data-leaving", "fade");
  await page.waitForURL("**/learn/drawing-the-best-line");
  expect(Date.now() - started).toBeLessThan(1500);
  expect(
    await page.evaluate(() => (window as typeof window & { lowest?: number }).lowest),
  ).toBeLessThan(0.5);
});

test("the palette on the home page jumps to a lesson by its real term", async ({ page }) => {
  await openHome(page);
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox").fill("gradient descent");
  await page.getByRole("option", { name: /Rolling downhill/ }).click();
  await page.waitForURL("**/learn/rolling-downhill");
});

test("the words paint within 1.5 s; the 3D arrives after", { tag: "@perf" }, async ({ page }) => {
  await page.goto("/");
  const paint = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entry = list.getEntriesByName("first-contentful-paint")[0];
          if (entry) resolve(entry.startTime);
        }).observe({ type: "paint", buffered: true });
      }),
  );
  test
    .info()
    .annotations.push({ type: "first-contentful-paint", description: `${Math.round(paint)} ms` });
  recordPerf({ firstContentfulPaintMs: paint });
  budget("first contentful paint (ms)", paint, 1500);
  expect(paint).toBeLessThan(5000);
});

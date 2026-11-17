import { expect, test, type Locator, type Page } from "@playwright/test";
import { budget, recordPerf } from "./frames";
import { watch } from "./watch";

// The stars float, so their links never hold still: pointer actions skip the stability wait.
const steady = { force: true } as const;
const done = { visited: true, missions: ["m"], predicted: true };

async function openHome(page: Page, path = "/"): Promise<string[]> {
  const { errors } = watch(page);
  await page.goto(path);
  await expect(page.locator("[data-star]")).toHaveCount(74);
  return errors;
}

/**
 * Waits until a star has stopped gliding (after a filter the camera moves for a moment, longer
 * on a busy machine), so a click lands on it. Its gentle float moves far less than this.
 */
async function settled(star: Locator) {
  let last = await star.boundingBox();
  await expect(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const now = await star.boundingBox();
    const moved = last && now ? Math.hypot(now.x - last.x, now.y - last.y) : Infinity;
    last = now;
    expect(moved).toBeLessThan(2);
  }).toPass({ timeout: 10_000 });
}

/** Saves progress straight into the site's IndexedDB, as if earlier visits had. */
async function seedProgress(page: Page, lessons: Record<string, typeof done>) {
  await page.goto("/");
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("neural-atlas", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("kv");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const write = open.result.transaction("kv", "readwrite");
          write.objectStore("kv").put(value, "progress-v1");
          write.oncomplete = () => {
            open.result.close();
            resolve();
          };
          write.onerror = () => reject(write.error);
        };
      }),
    { lessons },
  );
}

/** Whether the element at the centre of each star is that star's own link (or another star). */
async function starsUncovered(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-star]")].flatMap((star) => {
      const box = star.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit?.closest("[data-star]") ? [] : [`${star.dataset.star} under ${hit?.tagName}`];
    }),
  );
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

test("ideas still being drawn say so; built ones don't", async ({ page }) => {
  await openHome(page);
  await page.locator('[data-star="the-pattern-torch"]').hover(steady);
  await expect(page.getByRole("tooltip")).toContainText("Still being drawn");
  await expect(
    page.getByRole("link", { name: "The pattern torch, Still being drawn" }),
  ).toBeAttached();
  await page.mouse.move(0, 0);
  await page.locator('[data-star="stacking-cells"]').hover(steady);
  await expect(page.getByRole("tooltip")).toContainText("Stacking cells");
  await expect(page.getByRole("tooltip")).not.toContainText("Still being drawn");
});

test("a learned idea is announced as learned", async ({ page }) => {
  await seedProgress(page, { "rolling-downhill": done });
  await openHome(page);
  await expect(
    page.getByRole("link", { name: /Rolling downhill, You have learned this/ }),
  ).toBeAttached();
  await expect(
    page.getByRole("link", { name: /Teach by showing, A good one to try next/ }),
  ).toBeAttached();
});

test("the first Tab lands on the skip link, not a star", async ({ page }) => {
  await openHome(page);
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveText("Skip to the map");
  await expect(focused).not.toHaveAttribute("data-star");
});

test("the world filter keeps one group to choose from", async ({ page }) => {
  await openHome(page);
  await page.getByRole("radio", { name: "Learning by trying" }).click();
  await expect(page.locator("[data-star]")).toHaveCount(14);
  await expect(page).toHaveURL(/\?world=6$/);
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
    await page.getByRole("link", { name: "Rolling downhill" }).click(steady);
    await expect(page.getByRole("main")).toHaveAttribute("data-leaving", "fly");
    await page.waitForURL("**/learn/rolling-downhill");
    await expect(page.getByRole("heading", { level: 1, name: "Rolling downhill" })).toBeVisible({
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

test("the picked group is still picked after a lesson and Back", async ({ page }) => {
  await openHome(page);
  await page.getByRole("radio", { name: "Learning from examples" }).click();
  await settled(page.getByRole("link", { name: "Rolling downhill" }));
  await page.getByRole("link", { name: "Rolling downhill" }).click(steady);
  // Mid-flight the header (and its filter) cannot be used.
  await expect(page.locator("header")).toHaveAttribute("inert", "");
  await page.waitForURL("**/learn/rolling-downhill");
  await page.goBack();
  await expect(page.getByRole("radio", { name: "Learning from examples" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.locator("[data-star]")).toHaveCount(10);
});

test("clicking a built idea flies in, with its lesson already fetched", async ({ page }) => {
  await openHome(page);
  // Watch every frame for the lesson's loading line until the lesson's heading is up.
  await page.evaluate(() => {
    const watch = window as typeof window & { sawLoading?: boolean };
    watch.sawLoading = false;
    const sample = () => {
      const loading = [...document.querySelectorAll("[role=status]")].some(
        (node) => node.textContent?.includes("Setting the scene") && node.checkVisibility(),
      );
      watch.sawLoading ||= loading;
      if (!document.querySelector("h1")?.textContent?.includes("Rolling downhill")) {
        requestAnimationFrame(sample);
      }
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole("link", { name: "Rolling downhill" }).hover(steady);
  await page.getByRole("link", { name: "Rolling downhill" }).click(steady);
  await expect(page.getByRole("main")).toHaveAttribute("data-leaving", "fly");
  await page.waitForURL("**/learn/rolling-downhill");
  await expect(page.getByRole("heading", { level: 1, name: "Rolling downhill" })).toBeVisible();
  expect(
    await page.evaluate(() => (window as typeof window & { sawLoading?: boolean }).sawLoading),
  ).toBe(false);
});

test("an idea still being drawn fades across instead of flying", async ({ page }) => {
  await openHome(page);
  // Zooming out sits clear of its neighbours, so the click lands on it and not on one in front.
  await settled(page.getByRole("link", { name: "Zooming out" }));
  await page.getByRole("link", { name: "Zooming out" }).click(steady);
  await expect(page.getByRole("main")).toHaveAttribute("data-leaving", "fade");
  await page.waitForURL("**/learn/zooming-out");
});

test("a modifier-click on a star opens it in a new tab", async ({ page, context }) => {
  await openHome(page);
  const opened = context.waitForEvent("page");
  await page
    .getByRole("link", { name: "Rolling downhill" })
    .click({ ...steady, modifiers: ["ControlOrMeta"] });
  const tab = await opened;
  await tab.waitForURL("**/learn/rolling-downhill");
  await expect(page).toHaveURL(/\/$/);
});

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
  await page.getByRole("link", { name: "Rolling downhill" }).click(steady);
  await expect(page.getByRole("main")).toHaveAttribute("data-leaving", "fade");
  await page.waitForURL("**/learn/rolling-downhill");
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

test("the palette takes over a flight that has started", async ({ page }) => {
  await openHome(page);
  await page.getByRole("link", { name: "Rolling downhill" }).click(steady);
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox").fill("stacking cells");
  await page.getByRole("option", { name: /Stacking cells/ }).click();
  await page.waitForURL("**/learn/stacking-cells");
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/learn\/stacking-cells$/);
});

test("the locked page offers a lesson that is ready now", async ({ page }) => {
  await page.goto("/learn/the-pattern-torch");
  const ready = page.getByRole("navigation", { name: "Ready to explore now" });
  // The first built lesson in curriculum order, for a learner who has mastered nothing.
  await expect(ready.getByRole("link")).toHaveAttribute("href", "/learn/teach-by-showing");
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

for (const size of [
  { width: 1366, height: 768 },
  { width: 844, height: 390 },
]) {
  test(`no star is covered by the header at ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openHome(page);
    await page.locator("#map").scrollIntoViewIfNeeded();
    expect(await starsUncovered(page)).toEqual([]);
  });
}

for (const size of [
  { width: 640, height: 360 },
  { width: 320, height: 256 },
]) {
  test(`a short screen scrolls to the filter and the stars at ${size.width}×${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await openHome(page);
    const filter = page.getByRole("radio", { name: "All ideas" });
    await filter.scrollIntoViewIfNeeded();
    await expect(filter).toBeInViewport();
    const star = page.locator('[data-star="rolling-downhill"]');
    await star.scrollIntoViewIfNeeded();
    await expect(star).toBeInViewport();
    expect(await starsUncovered(page)).toEqual([]);
  });
}

test("every star's label stays inside a 375px screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await openHome(page);
  // One loop inside the page, so 74 stars cost 74 label renders, not hundreds of round trips
  // (a software-drawn map on CI made the per-star version outrun the test's time).
  // Each star: focus it, then wait (up to 5 s) for a visible label lying inside the screen.
  const outside = await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const failed: string[] = [];
    for (const star of document.querySelectorAll<HTMLElement>("[data-star]")) {
      star.focus();
      const until = performance.now() + 5000;
      let box: DOMRect | undefined;
      let inside = false;
      while (!inside && performance.now() < until) {
        await frame();
        // Only this star's label counts, not the last one on its way out.
        const labels = [...document.querySelectorAll('[role="tooltip"]')];
        const title = labels.length === 1 ? labels[0]?.querySelector("p")?.textContent : null;
        const mine = title && star.getAttribute("aria-label")?.startsWith(title);
        box = mine ? labels[0]?.getBoundingClientRect() : undefined;
        inside =
          box !== undefined &&
          box.width > 0 &&
          box.height > 0 &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= 375;
      }
      if (!inside) failed.push(`${star.dataset.star}: ${box ? JSON.stringify(box) : "no label"}`);
    }
    return failed;
  });
  expect(outside).toEqual([]);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test("the first tap shows the label; the second steps inside", async ({ page }) => {
    await openHome(page);
    const star = page.locator('[data-star="rolling-downhill"]');
    await star.tap(steady);
    await expect(page.getByRole("button", { name: "Open" })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await star.tap(steady);
    await page.waitForURL("**/learn/rolling-downhill");
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the home page still links every idea", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href^="/learn/"]')).toHaveCount(74);
    await expect(page.getByRole("heading", { name: "Learning by trying" })).toBeVisible();
  });
});

test.describe("without WebGL", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        kind: string,
        ...rest: unknown[]
      ) {
        if (/webgl/i.test(kind)) return null;
        return (getContext as (...args: unknown[]) => RenderingContext | null).call(
          this,
          kind,
          ...rest,
        );
      } as typeof getContext;
    });
  });

  test("home lists all 74 ideas and a link opens a lesson", async ({ page }) => {
    await page.goto("/");
    const list = page.getByRole("navigation", { name: "Every idea, group by group" });
    await expect(list.locator('a[href^="/learn/"]')).toHaveCount(74);
    await expect(page.locator("[data-star]")).toHaveCount(0);
    await list.getByRole("link", { name: "Rolling downhill" }).click();
    await page.waitForURL("**/learn/rolling-downhill");
  });
});

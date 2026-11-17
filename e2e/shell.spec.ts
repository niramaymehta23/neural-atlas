import { expect, test, type Page } from "@playwright/test";

/**
 * H2 hardening: site navigation, the lesson shell's layout and guards, links, error pages,
 * theme and the palette on touch. Wording comes from src/platform/captions.ts and
 * src/ui/captions.ts.
 */
const LESSONS = [
  { id: "rolling-downhill", start: "Let them roll" },
  { id: "stacking-cells", start: "Let it learn" },
  { id: "scoring-every-move", start: "Let it practise" },
] as const;
const BUILT =
  /\/learn\/(rolling-downhill|stacking-cells|who-is-looking-at-whom|scoring-every-move)$/;

const dial = (page: Page) => page.getByRole("slider", { name: "How big a step" });

async function openLesson(page: Page, id: string, hash = "") {
  await page.goto(`/learn/${id}${hash}`);
  await expect(page.locator("[data-region=scene]")).toBeVisible({ timeout: 20_000 });
}

async function openFixture(page: Page, hash = "") {
  await page.goto(`/styleguide/platform${hash}`);
  await expect(page.getByRole("heading", { name: "A ball in a valley" })).toBeVisible();
}

/** A snapshot link body made in the page, as a hand-made link would be. */
function linkFor(page: Page, json: unknown): Promise<string> {
  return page.evaluate(async (text) => {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }, JSON.stringify(json));
}

/** Writes saved progress straight into IndexedDB, as an earlier visit would have. */
function seedProgress(page: Page, lessons: Record<string, unknown>) {
  return page.evaluate(
    (lessons) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("neural-atlas", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("kv");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const transaction = request.result.transaction("kv", "readwrite");
          transaction.objectStore("kv").put({ lessons }, "progress-v1");
          transaction.oncomplete = () => {
            request.result.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    lessons,
  );
}

test.describe("site navigation (NAV-02, NAV-10)", () => {
  test("a lesson leads back to the map, and the map to today's puzzle", async ({ page }) => {
    await openLesson(page, "rolling-downhill");
    await page.getByRole("link", { name: "Back to the map" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("link", { name: "Today’s puzzle" }).click();
    await expect(page).toHaveURL(/\/puzzle$/);
    await expect(page.getByRole("link", { name: "Back to the map" })).toBeVisible();
  });

  test("a mastered lesson offers the next idea, a built one", async ({ page }) => {
    await page.goto("/styleguide");
    await seedProgress(page, {
      "rolling-downhill": { visited: true, missions: ["fly-off"], predicted: true },
    });
    await openLesson(page, "rolling-downhill");
    const next = page.locator("[data-next-idea]");
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute("href", BUILT);
  });

  test("an unknown page is a calm 404 with the way home", async ({ page }) => {
    const response = await page.goto("/learn/no-such-idea");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
    await expect(page).toHaveTitle("Not found · Neural Atlas");
    await expect(page.getByRole("link", { name: "Back to the map" })).toHaveAttribute("href", "/");
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(250, 249, 245)");
  });
});

test.describe("lesson failures (PLT-04, PLT-13)", () => {
  test("a lesson whose code fails to load offers to try again", async ({ page }) => {
    const html = await (await page.request.get("/learn/rolling-downhill")).text();
    const firstLoad = new Set(
      [...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map(([src]) => src),
    );
    // Every script the page asks for later (the lesson's own code) fails.
    await page.route("**/_next/static/chunks/**", (route) =>
      firstLoad.has(new URL(route.request().url()).pathname) ? route.continue() : route.abort(),
    );
    await page.goto("/learn/rolling-downhill");
    await expect(page.getByRole("alert")).toContainText("couldn’t load", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("a broken, other-lesson or old link says why it was ignored", async ({ page }) => {
    await openFixture(page, "#s=garbage");
    await expect(page.locator("[data-link-problem=broken]")).toBeVisible();
    const other = await linkFor(page, {
      v: 2,
      id: "rolling-downhill",
      state: {},
      guesses: {},
      touched: false,
      momentEpoch: null,
    });
    await openFixture(page, `#s=${other}`);
    await expect(page.locator("[data-link-problem=lesson]")).toBeVisible();
    const future = await linkFor(page, { v: 9, id: "fixture-valley" });
    await openFixture(page, `#s=${future}`);
    await expect(page.locator("[data-link-problem=version]")).toBeVisible();
  });
});

test.describe("snapshot links (PLT-08, PLT-02)", () => {
  test("a link that already meets a mission hands out no star", async ({ page }) => {
    await openFixture(page);
    const link = await linkFor(page, {
      v: 2,
      id: "fixture-valley",
      state: { step: 0.95, steps: 4 },
      guesses: {},
      touched: true,
      momentEpoch: null,
    });
    await openFixture(page, `#s=${link}`);
    await expect(dial(page)).toHaveAttribute("aria-valuenow", "0.95");
    await page.waitForTimeout(500);
    await expect(page.locator("[data-region=dock]").getByText("You earned a star.")).toHaveCount(0);
    // The link is gone from the address bar once opened... after the first change.
    await page.getByRole("button", { name: "Start from your own view" }).click();
    await expect(dial(page)).toHaveAttribute("aria-valuenow", "0.2");
    expect(page.url()).not.toContain("#s=");
  });

  test("a hand-made link with wild numbers is clamped, not frozen", async ({ page }) => {
    await openLesson(page, "stacking-cells");
    const wild = await linkFor(page, {
      v: 2,
      id: "stacking-cells",
      state: { layers: 100000, cells: 100000, step: 1e9 },
      guesses: {},
      touched: true,
      momentEpoch: null,
    });
    await openLesson(page, "stacking-cells", `#s=${wild}`);
    await expect(page.getByRole("slider", { name: "How many layers" })).toHaveAttribute(
      "aria-valuenow",
      "4",
    );
  });

  test("#mission= puts the puzzle's mission on the card", async ({ page }) => {
    await openLesson(page, "scoring-every-move", "#mission=too-fast-to-settle");
    await expect(page.locator("[data-mission]")).toHaveAttribute(
      "data-mission",
      "too-fast-to-settle",
    );
  });
});

test.describe("the predict-then-reveal flow (PLT-28, LIVE-11)", () => {
  test("guess first, reveal, then the next guess, all from the keyboard", async ({ page }) => {
    await openFixture(page);
    const dock = page.locator("[data-region=dock]");
    const guess = dock.getByRole("region", { name: "Make a guess" });
    const start = dock.getByRole("button", { name: "Take a step" });
    // The guess comes before the start button, on the page and on screen.
    const [guessBox, startBox] = [await guess.boundingBox(), await start.boundingBox()];
    expect(guessBox!.y).toBeLessThan(startBox!.y);
    await expect(guess).toContainText("Guess first, then press start.");

    await guess.getByRole("button", { name: "Flying off" }).focus();
    await page.keyboard.press("Enter");
    await dial(page).focus();
    await page.keyboard.press("End");
    for (let i = 0; i < 3; i += 1) await start.click();
    await page.getByRole("button", { name: "Show me what happens" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("You guessed: Flying off")).toBeVisible();
    const focusInside = await page.evaluate(
      () => document.activeElement?.closest("[aria-label='Make a guess']") !== null,
    );
    expect(focusInside).toBe(true);
  });

  test("compare can be switched on and off again and again", async ({ page }) => {
    await openFixture(page);
    const toggle = page.getByRole("switch", { name: "Compare side by side" });
    for (let i = 0; i < 4; i += 1) await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(page.getByRole("separator")).toBeVisible();
  });

  for (const { id, start } of LESSONS) {
    test(`${id}: the guess is offered before the start button`, async ({ page }) => {
      await openLesson(page, id);
      const dock = page.locator("[data-region=dock]");
      const guess = await dock.getByRole("region", { name: "Make a guess" }).boundingBox();
      const button = await dock.getByRole("button", { name: start }).boundingBox();
      expect(guess!.y).toBeLessThan(button!.y);
    });
  }
});

test.describe("lesson layout (LIVE-06, LIVE-07, LIVE-08)", () => {
  test("the scene card is only as tall as its content on a desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openLesson(page, "scoring-every-move");
    const gap = await page.locator("[data-region=scene]").evaluate((section) => {
      const last = section.lastElementChild!.getBoundingClientRect();
      return section.getBoundingClientRect().bottom - last.bottom;
    });
    expect(gap).toBeLessThanOrEqual(18);
  });

  test("on a phone the scene and the timeline stay in view while turning the dials", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLesson(page, "rolling-downhill");
    await page.locator("[data-region=dock] [role=slider]").first().scrollIntoViewIfNeeded();
    const inView = (selector: string) =>
      page.locator(selector).evaluate((element) => {
        const box = element.getBoundingClientRect();
        return box.bottom > 0 && box.top < window.innerHeight;
      });
    expect(await inView("[data-region=scene]")).toBe(true);
    expect(await inView("[data-region=stage] [role=slider][aria-label=Moment]")).toBe(true);
  });

  for (const width of [1280, 375]) {
    for (const { id, start } of LESSONS) {
      test(`${id} at ${width}px: pressing start does not jump the page`, async ({ page }) => {
        await page.setViewportSize({ width, height: 812 });
        await openLesson(page, id);
        const skip = page.getByRole("button", { name: "Skip the guess for now" });
        if (await skip.isVisible()) await skip.click();
        const button = page.locator("[data-region=dock]").getByRole("button", { name: start });
        await button.scrollIntoViewIfNeeded();
        const before = await page.evaluate(() => window.scrollY);
        const top = (await button.boundingBox())!.y;
        await button.click();
        await page.waitForTimeout(1200);
        expect(await page.evaluate(() => window.scrollY)).toBe(before);
        const after = (await page
          .locator("[data-region=dock]")
          .getByRole("button")
          .first()
          .boundingBox())!;
        expect(Math.abs((await button.boundingBox())?.y ?? after.y) - top).toBeLessThan(8);
      });
    }
  }
});

test.describe("theme (A11Y-06)", () => {
  test("follows the system's dark setting before the page draws, with the switch on every page", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
    await expect(page.getByRole("group", { name: "Page colour" })).toBeVisible();
    await openLesson(page, "rolling-downhill");
    const picker = page.getByRole("group", { name: "Page colour" });
    await picker.getByRole("radio", { name: "Day" }).click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("ivory");
    await page.reload({ waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("ivory");
  });
});

test.describe("the palette (A11Y-18, NAV-03, NAV-21, NAV-29)", () => {
  test("its own example search finds an idea", async ({ page }) => {
    await page.goto("/puzzle");
    await page.keyboard.press("ControlOrMeta+k");
    const box = page.getByRole("combobox");
    const example = (await box.getAttribute("placeholder"))!.match(/“(.+)”/)![1]!;
    await box.fill(example);
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("a jump fades between pages and lands focus on the new heading", async ({ page }) => {
    await page.goto("/puzzle");
    await expect(page.getByRole("heading", { name: "Today’s puzzle" })).toBeVisible();
    await page.evaluate(() => {
      const seen: number[] = [];
      (window as unknown as { opacities: number[] }).opacities = seen;
      const sample = () => {
        const fade = document.querySelector("[data-route-fade]");
        if (fade) seen.push(Number(getComputedStyle(fade).opacity));
        requestAnimationFrame(sample);
      };
      sample();
    });
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByRole("combobox").fill("rolling downhill");
    await page.getByRole("option", { name: /Rolling downhill/ }).click();
    await expect(page).toHaveURL(/rolling-downhill$/);
    await expect(page.getByRole("heading", { level: 1, name: "Rolling downhill" })).toBeFocused({
      timeout: 15_000,
    });
    const lowest = await page.evaluate(() =>
      Math.min(...(window as unknown as { opacities: number[] }).opacities),
    );
    expect(lowest).toBeLessThan(1);
  });
});

test.describe("on a touch phone (A11Y-18)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  for (const path of ["/", "/puzzle", "/learn/rolling-downhill", "/learn/teach-by-showing"]) {
    test(`${path}: the find button shows no keyboard shortcut and covers nothing`, async ({
      page,
    }) => {
      await page.goto(path);
      const trigger = page.getByRole("button", { name: /Find an idea/ }).first();
      await expect(trigger).toBeVisible({ timeout: 20_000 });
      await expect(trigger.locator("[data-shortcut]")).toBeHidden();
      const overlaps = await trigger.evaluate((button) => {
        const own = button.getBoundingClientRect();
        return [...document.querySelectorAll("a, button, input, [role=slider], [tabindex='0']")]
          .filter((other) => other !== button && !button.contains(other) && !other.contains(button))
          .filter((other) => {
            const box = other.getBoundingClientRect();
            return (
              box.width > 0 &&
              box.left < own.right &&
              box.right > own.left &&
              box.top < own.bottom &&
              box.bottom > own.top
            );
          }).length;
      });
      expect(overlaps).toBe(0);
    });
  }
});

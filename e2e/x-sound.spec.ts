import type { Page } from "@playwright/test";
import { sandboxCaptions } from "../src/experiences/sandbox/captions";
import { soundCaptions as words } from "../src/experiences/sound/captions";
import { theatreCaptions } from "../src/experiences/theatre/captions";
import { earned, expect, openPage, RUN, SOON, test } from "./x";

/** REQ-EXP-05: learning as sound, and no audio at all until it is asked for. */
type Heard = { made: number; closed: number; notes: number[] };

/** Counts every audio context and notes the pitch of every note played. */
async function listen(page: Page) {
  await page.addInitScript(() => {
    const heard = { made: 0, closed: 0, notes: [] as number[] };
    (window as unknown as { heard: typeof heard }).heard = heard;
    const Real = window.AudioContext;
    window.AudioContext = class extends Real {
      constructor(options?: AudioContextOptions) {
        super(options);
        heard.made += 1;
      }
      override createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when) => {
          heard.notes.push(oscillator.frequency.value);
          start(when);
        };
        return oscillator;
      }
      override close() {
        heard.closed += 1;
        return super.close();
      }
    };
  });
}
const heard = (page: Page) => page.evaluate(() => (window as unknown as { heard: Heard }).heard);

test("no page makes any audio until the sound is turned on", async ({ page }) => {
  await listen(page);
  for (const path of ["/", "/explore", "/museum", "/theatre", "/two-player", "/sandbox"]) {
    await openPage(page, path, "h1");
    await page.mouse.click(5, 5);
    await page.keyboard.press("Tab");
    expect((await heard(page)).made, path).toBe(0);
  }
  await page.locator("[data-run]").click();
  await expect
    .poll(() => page.locator("[data-steps]").getAttribute("data-steps").then(Number), SOON)
    .toBeGreaterThan(5);
  expect((await heard(page)).made).toBe(0);
});

test("the note falls as the mistakes shrink, and off means silent", async ({ page }) => {
  test.setTimeout(120_000);
  await listen(page);
  await openPage(page, "/sandbox", "[data-run]");
  await page.getByRole("radio", { name: sandboxCaptions.gardens.names.blobs }).click();
  await page.getByRole("radio", { name: sandboxCaptions.models.names.team }).click();
  const toggle = page.getByRole("switch", { name: words.toggle });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect((await heard(page)).made).toBe(1);
  expect((await heard(page)).notes).toEqual([]);
  await page.locator("[data-run]").click();
  await expect.poll(async () => (await heard(page)).notes.length, RUN).toBeGreaterThan(20);
  const { notes } = await heard(page);
  expect(notes.at(-1)).toBeLessThan(notes[0] ?? 0);
  await earned(page, "sound");
  await toggle.click();
  await expect.poll(async () => (await heard(page)).closed).toBe(1);
  const after = (await heard(page)).notes.length;
  await page.waitForTimeout(700);
  expect((await heard(page)).notes.length).toBe(after);
});

test("a lesson that trains can be heard too", async ({ page }) => {
  await listen(page);
  await openPage(page, "/learn/stacking-cells", "[data-region=scene]");
  const toggle = page.getByRole("switch", { name: words.toggle });
  await toggle.click();
  expect((await heard(page)).made).toBe(1);
  await page.getByRole("button", { name: "Let it learn" }).click();
  await expect.poll(async () => (await heard(page)).notes.length, RUN).toBeGreaterThan(3);
  // Leaving the page falls silent.
  await page.getByRole("link", { name: "Back to the map" }).click();
  await expect.poll(async () => (await heard(page)).closed, SOON).toBe(1);
});

test("a lesson with nothing to train has no sound switch", async ({ page }) => {
  await openPage(page, "/learn/chopping-text-into-pieces", "[data-region=scene]");
  await expect(page.getByRole("switch", { name: words.toggle })).toHaveCount(0);
});

test("says so where sound cannot be played", async ({ page }) => {
  await page.addInitScript(() => {
    window.AudioContext = class {
      constructor() {
        throw new Error("no sound here");
      }
    } as unknown as typeof AudioContext;
  });
  await openPage(page, "/sandbox", "[data-run]");
  await page.getByRole("switch", { name: words.toggle }).click();
  await expect(page.getByRole("alert").filter({ hasText: words.failed })).toBeVisible();
  await expect(page.getByRole("switch", { name: words.toggle })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("the theatre is silent", async ({ page }) => {
  await openPage(page, "/theatre", "h1");
  await expect(page.getByRole("button", { name: theatreCaptions.pause })).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(0);
});

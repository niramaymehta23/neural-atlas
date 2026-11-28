import type { Page } from "@playwright/test";
import { worlds } from "../src/catalog";
import { journeys } from "../src/experiences/journeys/journeys";
import { words as mapWords } from "../src/modules/w2-classic-ml/a-map-of-everything/captions";
import { words as internetWords } from "../src/modules/w5-transformers/reading-the-internet/captions";
import { words as catchWords } from "../src/modules/w6-reinforcement/a-brain-for-the-game/captions";
import { gpuTagFor } from "./gpu";
import { countWork, hideTab, stillDoing, workOver } from "./light";
import { openPage, expect, test } from "./x";

/**
 * Kind to the processor (docs/light/spec.md): a page with nothing moving does nothing, a hidden
 * tab does nothing, and a page that moves costs no more than its budget.
 */

/** Long enough for a picture that only breathes to come to rest (REST_MS), on a slow machine. */
const REST = { timeout: 60_000, intervals: [500] };

/** Opens `path` and waits until it has come to rest. */
async function rests(page: Page, path: string, ready: string) {
  await countWork(page);
  await openPage(page, path, ready);
  await expect.poll(() => stillDoing(page), REST).toBe("");
}

for (const { lessons } of worlds)
  for (const { id, load } of lessons)
    if (load)
      test(
        `${id} does nothing while it is left alone`,
        { tag: gpuTagFor(`/learn/${id}`) },
        async ({ page }) => {
          test.setTimeout(120_000);
          await rests(page, `/learn/${id}`, "[data-region=scene]");
        },
      );

for (const path of [
  "/sandbox",
  "/museum",
  "/two-player",
  "/puzzle",
  "/explore",
  "/journeys",
  ...journeys.map(({ id }) => `/journeys/${id}`),
])
  test(`${path} does nothing while it is left alone`, async ({ page }) => {
    test.setTimeout(120_000);
    await rests(page, path, "h1");
  });

test("the home map floats, rests once the learner is away, and wakes on a sign of them", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await countWork(page);
  await openPage(page, "/", "[data-star]");
  await page.mouse.move(400, 300);
  await expect.poll(async () => (await workOver(page, 500)).draws, REST).toBeGreaterThan(0);
  await expect.poll(() => stillDoing(page), REST).toBe("");
  await page.mouse.move(500, 350);
  await expect.poll(async () => (await workOver(page, 500)).draws, REST).toBeGreaterThan(0);
});

test("the home map and the theatre draw nothing in a hidden tab, and carry on after", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await countWork(page);
  for (const [path, ready, count] of [
    ["/", "[data-star]", "draws"],
    ["/theatre", "[data-playing=true]", "paints"],
  ] as const) {
    await openPage(page, path, ready);
    await page.mouse.move(400, 300);
    await expect.poll(async () => (await workOver(page, 500))[count], REST).toBeGreaterThan(0);
    await hideTab(page, true);
    await expect.poll(() => stillDoing(page), REST).toBe("");
    await hideTab(page, false);
    await page.mouse.move(420, 320);
    await expect.poll(async () => (await workOver(page, 500))[count], REST).toBeGreaterThan(0);
  }
});

const press = (page: Page, name: string) =>
  page.locator("[data-region=dock]").getByRole("button", { name }).click();
const steps = (page: Page, name: string) =>
  page
    .locator(`[${name}]`)
    .first()
    .getAttribute(name)
    .then((value) => Number(value));

/** Pages that practise by themselves, in a worker, once asked to. */
const PRACTISING: readonly {
  path: string;
  ready: string;
  /** Says how far the practice has got. */
  at: string;
  start: (page: Page) => Promise<void>;
}[] = [
  {
    path: "/learn/stacking-cells",
    ready: "[data-testid=stacking-cells]",
    at: "data-epoch",
    start: (page) => press(page, "Let it learn"),
  },
  {
    path: "/learn/a-map-of-everything",
    ready: "[data-testid=a-map-of-everything]",
    at: "data-step",
    start: async (page) => {
      // The most things there can be, so it is still settling when the tab is hidden.
      await page.locator("[data-region=dock]").getByRole("slider").first().focus();
      await page.keyboard.press("End");
      await press(page, mapWords.settle);
    },
  },
  {
    path: "/learn/reading-the-internet",
    ready: "[data-sample]",
    at: "data-step",
    start: (page) => press(page, internetWords.practise),
  },
  {
    path: "/learn/a-brain-for-the-game",
    ready: "[data-testid=a-brain-for-the-game]",
    at: "data-step",
    start: (page) => press(page, catchWords.practise),
  },
  {
    path: "/sandbox",
    ready: "[data-run]",
    at: "data-steps",
    start: (page) => page.locator("[data-run]").click(),
  },
];

for (const { path, ready, at, start } of PRACTISING)
  test(`${path} holds its practice still in a hidden tab, and carries on from there`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await countWork(page);
    await openPage(page, path, ready);
    await start(page);
    await expect.poll(() => steps(page, at), REST).toBeGreaterThan(0);
    await hideTab(page, true);
    await expect.poll(async () => (await workOver(page, 1500)).messages, REST).toBe(0);
    const held = await steps(page, at);
    await page.waitForTimeout(1500);
    expect(await steps(page, at)).toBe(held);
    await hideTab(page, false);
    await expect.poll(() => steps(page, at), REST).toBeGreaterThan(held);
  });

test("a lesson brings its own code, not the other lessons'", async ({ page }) => {
  const scripts = async (path: string, ready: string) => {
    let bytes = 0;
    const sizes: Promise<void>[] = [];
    const count = (response: { url: () => string; body: () => Promise<Buffer> }) => {
      if (new URL(response.url()).pathname.endsWith(".js"))
        sizes.push(
          response.body().then(
            (body) => void (bytes += body.length),
            () => undefined,
          ),
        );
    };
    page.on("response", count);
    await openPage(page, path, ready);
    await page.waitForLoadState("networkidle");
    page.off("response", count);
    await Promise.all(sizes);
    return bytes;
  };
  const sandbox = await scripts("/sandbox", "[data-run]");
  // A flat lesson needs about what the sandbox does; three times as much means it brings 3D,
  // training and everybody else's scenes along.
  const lesson = await scripts("/learn/ask-the-neighbours", "[data-region=scene]");
  expect(lesson).toBeLessThan(sandbox * 1.6);
});

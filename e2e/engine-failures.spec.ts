import { expect, test, type Locator } from "@playwright/test";

/** Read the scene's practice counter as a number. */
const epochOf = async (scene: Locator) => Number(await scene.getAttribute("data-epoch"));

test("stacking cells still trains without cross-origin isolation (ENG-06)", async ({ page }) => {
  // Serve pages without the isolation headers, as a host that ignores _headers would.
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["cross-origin-opener-policy"];
    delete headers["cross-origin-embedder-policy"];
    await route.fulfill({ response, headers });
  });
  await page.goto("/learn/stacking-cells");
  expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(false);

  const scene = page.getByTestId("stacking-cells");
  await page.getByRole("button", { name: "Let it learn" }).click();
  await expect.poll(() => epochOf(scene)).toBeGreaterThan(10);
  const before = await epochOf(scene);
  await expect.poll(() => epochOf(scene)).toBeGreaterThan(before);
});

test("a training worker that cannot load shows the lesson's problem caption (ENG-07)", async ({
  page,
}) => {
  // Turbopack starts every worker through a bootstrap script (turbopack-worker-<hash>.js) that
  // then loads /_next/static/media/worker.<hash>.ts; failing either keeps the worker from starting.
  await page.route(/\/(turbopack-worker-[^/]+\.js|media\/worker\.[^/]+)$/, (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.goto("/learn/stacking-cells");
  await expect(page.getByText(/went wrong/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Try again/ })).toBeVisible();
});

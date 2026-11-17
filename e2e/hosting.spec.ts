import { expect, test } from "@playwright/test";
import { ATTENTION_MODEL, RUNTIME_FILES, RUNTIME_PATH } from "../src/engine/pretrained/runtime";
import { watch } from "./watch";

// What the host must do for the site to work. Runs against the e2e server and, through
// playwright.hosted.config.ts, against a real deployment after every deploy.

for (const path of ["/", "/learn/stacking-cells"]) {
  test(`${path} is cross-origin isolated`, async ({ page, request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response.headers()["cross-origin-embedder-policy"]).toBe("require-corp");
    await page.goto(path);
    expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
  });
}

test("serves the ONNX runtime with WebAssembly and module types, cached for a day", async ({
  request,
}) => {
  const wasm = await request.get(RUNTIME_PATH + RUNTIME_FILES.wasm);
  expect(wasm.status()).toBe(200);
  expect(wasm.headers()["content-type"]).toBe("application/wasm");
  expect(wasm.headers()["cache-control"]).toContain("max-age=86400");
  const mjs = await request.get(RUNTIME_PATH + RUNTIME_FILES.mjs);
  expect(mjs.headers()["content-type"]).toMatch(/^(text|application)\/javascript/);
});

test("the model sits in a versioned folder, cached for a day", async ({ request }) => {
  expect(ATTENTION_MODEL).toMatch(/-v\d+$/);
  const config = await request.get(`/models/${ATTENTION_MODEL}/config.json`);
  expect(config.status()).toBe(200);
  expect(config.headers()["cache-control"]).toContain("max-age=86400");
});

test("hashed build files are cached for a year", async ({ page, request }) => {
  await page.goto("/");
  const script = await page.locator("script[src^='/_next/static/']").first().getAttribute("src");
  const response = await request.get(script ?? "");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
});

test("a trailing slash ends at the lesson", async ({ page }) => {
  const response = await page.goto("/learn/rolling-downhill/");
  expect(new URL(page.url()).pathname).toBe("/learn/rolling-downhill");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Rolling downhill" })).toBeVisible();
});

test("the attention lesson loads its model and runtime from this site", async ({
  page,
  baseURL,
}) => {
  const { errors, elsewhere } = watch(page, new URL(baseURL ?? "").hostname);
  await page.goto("/learn/who-is-looking-at-whom");
  await expect(page.getByTestId("looking")).toHaveAttribute("data-ready", "true", {
    timeout: 60_000,
  });
  await expect(page.locator("[data-thread]").first()).toBeAttached();
  expect(elsewhere).toEqual([]);
  expect(errors).toEqual([]);
});

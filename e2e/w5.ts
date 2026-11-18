import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Shared steps for the World 5 lesson specs (e2e/w5-*.spec.ts). Wording comes from each lesson's captions. */
export const dock = (page: Page) => page.locator("[data-region=dock]");

/** Opens a lesson and waits for its scene, with the language file it needs loaded. */
export async function open(page: Page, id: string, testId = id, ready = "[data-region=scene]") {
  await page.goto(`/learn/${id}`);
  await expect(page.getByTestId(testId)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(ready).first()).toBeVisible({ timeout: 20_000 });
}

/** Focuses the main view's dial called `label` and presses `key` `times` times. */
export async function turn(page: Page, label: string, key: string, times = 1) {
  await dock(page).getByRole("slider", { name: label }).first().focus();
  for (let at = 0; at < times; at += 1) await page.keyboard.press(key);
}

export async function starred(page: Page) {
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 20_000 });
}

/** Reads what a view shows, for comparing two pages. */
export type Reader = (on: Page) => Promise<string>;

/** The words shown inside `selector` (the first match). */
export const textOf =
  (selector: string): Reader =>
  async (on) =>
    (await on.locator(selector).first().textContent()) ?? "";

/** An attribute of the first match of `selector`. */
export const attributeOf =
  (selector: string, name: string): Reader =>
  async (on) =>
    (await on.locator(selector).first().getAttribute(name)) ?? "";

/** What the main view's dial called `label` says. */
export const dialSays =
  (label: string): Reader =>
  async (on) =>
    (await dock(on).getByRole("slider", { name: label }).first().getAttribute("aria-valuetext")) ??
    "";

/** Copies a link to the view and opens it in a fresh page, where every reader reads the same. */
export async function linkKeeps(
  page: Page,
  context: BrowserContext,
  id: string,
  readers: Reader[],
) {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const before = await Promise.all(readers.map((read) => read(page)));
  for (const said of before) expect(said).not.toBe("");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();
  const fresh = await context.newPage();
  await fresh.goto(`/learn/${id}${new URL(page.url()).hash}`);
  await expect
    .poll(() => Promise.all(readers.map((read) => read(fresh))), { timeout: 20_000 })
    .toEqual(before);
  return fresh;
}

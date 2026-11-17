import { expect, type Page } from "@playwright/test";

/**
 * Waits until a recorded run is on the timeline and has played to its end. The Play button
 * alone is not enough: it shows before anything is recorded too, and a run is worked out in
 * slices before it is recorded.
 */
export async function runEnded(page: Page, timeout = 20_000) {
  const moment = page.getByRole("slider", { name: "Moment" });
  await expect(async () => {
    const max = Number(await moment.getAttribute("aria-valuemax"));
    expect(max).toBeGreaterThan(0);
    expect(Number(await moment.getAttribute("aria-valuenow"))).toBe(max);
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 100 });
  }).toPass({ timeout });
}

import type { Page } from "@playwright/test";

/**
 * Chromium's own stand-in camera (a moving test pattern), switched on for a whole spec file with
 * `test.use(FAKE_CAMERA)`. The browser's permission prompt is accepted automatically, so the
 * lesson's own plain question is the only one on screen.
 */
export const FAKE_CAMERA = {
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
};

/** The camera refused, as when the learner (or the browser) says no. */
export async function refuseCamera(page: Page) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
}

/** How many camera pictures a lesson has read so far (its `data-reads`). */
export async function reads(page: Page): Promise<number> {
  return Number((await page.locator("[data-reads]").first().getAttribute("data-reads")) ?? 0);
}

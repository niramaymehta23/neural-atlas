import { expect, test, type Page } from "@playwright/test";

/** Frame-to-frame gaps (ms) measured with requestAnimationFrame for `seconds`. */
export async function frameGaps(page: Page, seconds: number): Promise<number[]> {
  return page.evaluate(
    (duration) =>
      new Promise<number[]>((resolve) => {
        const gaps: number[] = [];
        let last = performance.now();
        const end = last + duration * 1000;
        const step = (now: number) => {
          gaps.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(step);
          else resolve(gaps.slice(1));
        };
        requestAnimationFrame(step);
      }),
    seconds,
  );
}

function summarise(gaps: number[]) {
  const sorted = [...gaps].sort((a, b) => a - b);
  return {
    mean: gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? Infinity,
    frames: gaps.length,
  };
}

/** Steady state: lets page start-up (hydration, WebGL contexts) finish before measuring. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await frameGaps(page, 1);
}

/** 60 fps: a frame every 16.7 ms on average, and almost no long frames. */
export function expectSixtyFps(gaps: number[]) {
  const { mean, p95, frames } = summarise(gaps);
  test.info().annotations.push({
    type: "frames",
    description: `${frames} frames, mean ${mean.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms`,
  });
  expect(mean).toBeLessThanOrEqual(17.5);
  expect(p95).toBeLessThanOrEqual(25);
}

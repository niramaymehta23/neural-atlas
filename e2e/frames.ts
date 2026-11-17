import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * How strictly timing is judged. `reference` (the default off CI: a laptop or real hardware) holds
 * the real budgets, such as 60 fps. `ci` (the default on CI, whose runners draw WebGL in software
 * on two shared cores) records the same budgets as warnings and fails only on gross regressions.
 * Set PERF_PROFILE to choose either explicitly.
 */
export const PERF_PROFILE: "reference" | "ci" =
  process.env.PERF_PROFILE === "reference" || process.env.PERF_PROFILE === "ci"
    ? process.env.PERF_PROFILE
    : process.env.CI
      ? "ci"
      : "reference";

/** Gross regressions, judged on every profile against an idle baseline from the same page. */
export const GROSS = {
  /** Extra main-thread long-task time per 3 s of measurement. */
  longTaskMsPer3s: 100,
  /** Extra share of frames that took longer than two frames (33 ms). */
  droppedRatio: 0.1,
} as const;

export type FrameSample = { gaps: number[]; longTasks: number[]; seconds: number };

/**
 * Frame-to-frame gaps (ms) from requestAnimationFrame and the main thread's long tasks (over
 * 50 ms, from PerformanceObserver), measured together for `seconds`.
 */
export async function measureFrames(page: Page, seconds: number): Promise<FrameSample> {
  const { gaps, longTasks } = await page.evaluate(
    (duration) =>
      new Promise<{ gaps: number[]; longTasks: number[] }>((resolve) => {
        const longTasks: number[] = [];
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) longTasks.push(entry.duration);
        });
        observer.observe({ type: "longtask" });
        const gaps: number[] = [];
        let last = performance.now();
        const end = last + duration * 1000;
        const step = (now: number) => {
          gaps.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(step);
          else {
            observer.disconnect();
            resolve({ gaps: gaps.slice(1), longTasks });
          }
        };
        requestAnimationFrame(step);
      }),
    seconds,
  );
  return { gaps, longTasks, seconds };
}

export function summarise({ gaps, longTasks, seconds }: FrameSample) {
  const sorted = [...gaps].sort((a, b) => a - b);
  const frames = gaps.length;
  return {
    frames,
    mean: frames ? gaps.reduce((sum, gap) => sum + gap, 0) / frames : Infinity,
    p95: sorted[Math.floor(frames * 0.95)] ?? Infinity,
    droppedRatio: frames ? gaps.filter((gap) => gap > 33).length / frames : 1,
    longTaskMsPer3s: (longTasks.reduce((sum, task) => sum + task, 0) * 3) / seconds,
  };
}
export type FrameSummary = ReturnType<typeof summarise>;

/** Steady state: lets page start-up (hydration, WebGL contexts) finish before measuring. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await measureFrames(page, 1);
}

const round = (value: number) => Math.round(value * 100) / 100;
const describeFrames = (summary: FrameSummary) =>
  `${summary.frames} frames, mean ${summary.mean.toFixed(2)} ms, p95 ${summary.p95.toFixed(2)} ms, ` +
  `${(summary.droppedRatio * 100).toFixed(1)}% dropped, ${summary.longTaskMsPer3s.toFixed(0)} ms long tasks per 3 s`;

/** Writes this test's numbers to test-results/perf/<test>.json (CI keeps the folder). */
export function recordPerf(data: Record<string, unknown>) {
  const info = test.info();
  const name = info.titlePath
    .slice(1)
    .join(" ")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  const folder = join("test-results", "perf");
  mkdirSync(folder, { recursive: true });
  const body = JSON.stringify({ test: info.title, profile: PERF_PROFILE, ...data }, null, 2);
  writeFileSync(join(folder, `${name.slice(0, 120)}.json`), body);
}

/**
 * A budget the reference profile enforces and the ci profile reports: on CI it becomes a
 * `budget-missed` annotation (and a warning in the log) instead of a failure.
 */
export function budget(label: string, actual: number, limit: number) {
  const met = actual <= limit;
  test.info().annotations.push({
    type: met ? "budget" : "budget-missed",
    description: `${label}: ${round(actual)} (budget ${limit}, ${PERF_PROFILE} profile)`,
  });
  if (PERF_PROFILE === "reference") expect(actual, label).toBeLessThanOrEqual(limit);
  else if (!met)
    console.warn(`perf budget missed on ${PERF_PROFILE}: ${label} ${round(actual)} > ${limit}`);
}

/**
 * 60 fps while `loaded` was measured: a frame every 16.7 ms on average and almost no long
 * frames (the reference budget), and never grossly worse than the idle `baseline` taken on the
 * same page in the same run (every profile).
 */
export function expectSmooth(baseline: FrameSample, loaded: FrameSample) {
  const idle = summarise(baseline);
  const busy = summarise(loaded);
  const info = test.info();
  info.annotations.push(
    { type: "frames-idle", description: describeFrames(idle) },
    { type: "frames", description: describeFrames(busy) },
  );
  recordPerf({ idle, busy, gross: GROSS });

  budget("mean frame (ms)", busy.mean, 17.5);
  budget("p95 frame (ms)", busy.p95, 25);
  expect(
    busy.longTaskMsPer3s - idle.longTaskMsPer3s,
    "extra long-task time per 3 s over the idle page",
  ).toBeLessThan(GROSS.longTaskMsPer3s);
  expect(
    busy.droppedRatio - idle.droppedRatio,
    "extra share of dropped frames over the idle page",
  ).toBeLessThan(GROSS.droppedRatio);
}

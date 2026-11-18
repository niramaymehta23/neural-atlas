import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets two checkouts run their suites side by side.
const PORT = Number(process.env.E2E_PORT ?? 4173);
const CI = Boolean(process.env.CI);

// Runs against the static export (`pnpm build` first), served with the real `_headers`.
// Three projects: `functional` runs everything not tagged @perf or @gpu in parallel; `gpu` then runs
// the tests of lessons that read pictures with a model (WebGL drawn in software keeps several cores
// busy per page, see e2e/gpu.ts) one at a time; `perf` runs the timing tests one at a time last,
// so nothing else competes for the CPU.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: CI,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "functional",
      grepInvert: /@perf|@gpu/,
      retries: CI ? 1 : 0,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "gpu",
      grep: /@gpu/,
      grepInvert: /@perf/,
      dependencies: ["functional"],
      fullyParallel: false,
      workers: 1,
      retries: CI ? 1 : 0,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "perf",
      grep: /@perf/,
      dependencies: ["gpu"],
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm serve ${PORT}`,
    url: `http://localhost:${PORT}/styleguide`,
    // Always a fresh server, so a stale out/ from an earlier build is never what gets tested.
    reuseExistingServer: false,
  },
});

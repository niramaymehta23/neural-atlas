import { defineConfig, devices } from "@playwright/test";

// Post-deploy smoke test: e2e/hosting.spec.ts against a real deployment.
// Usage: HOSTED_URL=https://<deployment> pnpm e2e:hosted
const baseURL = process.env.HOSTED_URL;
if (!baseURL) throw new Error("Set HOSTED_URL to the deployment to check.");

export default defineConfig({
  testDir: "e2e",
  testMatch: "hosting.spec.ts",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { ...devices["Desktop Chrome"], baseURL, trace: "retain-on-failure" },
});

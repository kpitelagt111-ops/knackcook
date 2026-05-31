import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for KnackCook E2E.
 *
 * The dev/start server is NOT managed by Playwright. The orchestrator
 * starts `node .next/standalone/server.js` (or `pnpm start`) on port 3000
 * manually before running `pnpm test:e2e`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

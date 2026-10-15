import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke-тесты. По умолчанию — Chromium из `npx playwright install chromium`.
 * Можно использовать установленный браузер: PW_CHANNEL=msedge (или chrome) npm run test:e2e
 */
const channel = process.env.PW_CHANNEL || undefined;
const port = Number(process.env.PW_PORT || 3030);

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1440, height: 900 } } },
    // эмуляция iPhone (touch, мобильный UA, safe-area) на движке Chromium
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium", channel } },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

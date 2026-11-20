import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const python = process.env.NEXUS_E2E_PYTHON || "python";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
    timezoneId: "Asia/Kolkata",
    launchOptions: process.env.NEXUS_E2E_BROWSER_CHANNEL
      ? { channel: process.env.NEXUS_E2E_BROWSER_CHANNEL }
      : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    {
      command: `"${python}" -m uvicorn e2e.context_fixture:app --host 127.0.0.1 --port 8101 --no-access-log`,
      url: "http://127.0.0.1:8101/health/live",
      env: { NEXUS_E2E: "1", PYTHONPATH: path.resolve("backend") },
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101",
      env: { NEXUS_CONTEXT_API_URL: "http://127.0.0.1:8101", NEXT_PUBLIC_NEXUS_RUNTIME_MODE: "mock" },
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});

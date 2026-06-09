// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { TEST_MONGO_URL } from "./tests/e2e/support/db";

dotenv.config({ path: path.join(__dirname, ".env.local") });

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1, // shared mutable test DB → serial
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production build for full fidelity. To iterate faster locally, run
    // `npm run build` once yourself, then change command to "npm run start".
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000, // build can be slow
    env: {
      // Override ONLY the DB; AUTH_SECRET/AUTH_URL/AWS creds inherit from env.
      MONGO_URL: TEST_MONGO_URL,
      AUTH_URL: "http://127.0.0.1:3000/",
      NODE_OPTIONS: "--dns-result-order=ipv4first",
    },
  },
});

import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const isCI = Boolean(process.env.CI);

// E2E helpers (e2e/support/users.ts) need the same Supabase values as the
// app. loadEnvConfig is Next.js's own loader, so it reads .env.local exactly
// like `next dev` does. It never overrides variables that are already set,
// so in CI the values from $GITHUB_ENV win (and there is no .env.local).
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  // Chromium only: enough for smoke tests, keeps CI fast.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI tests the production build; locally the dev server is reused.
    command: isCI ? "npm run start" : "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});

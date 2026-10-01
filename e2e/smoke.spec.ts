import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
});

test("protected route redirects to login when signed out", async ({ page }) => {
  await page.goto("/dashboard");
  // Set by src/lib/supabase/proxy.ts for routes not in PUBLIC_PATHS.
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

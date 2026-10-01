import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same alias as tsconfig.json ("@/*" -> "./src/*").
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // JSX is compiled using "jsx": "react-jsx" from tsconfig.json,
    // so no React plugin is needed.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Unit and component tests only. E2E tests live in e2e/ (Playwright),
    // database tests in supabase/tests/ (pgTAP).
    include: ["src/**/*.test.{ts,tsx}"],
    // Placeholder values so modules that import src/lib/env.ts can load.
    // Unit tests never talk to a real database.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
  },
});

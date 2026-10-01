import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Unmount rendered components after each test.
afterEach(() => {
  cleanup();
});

// "server-only" throws outside the Next.js server runtime.
// Mock it so server modules can be unit tested.
vi.mock("server-only", () => ({}));

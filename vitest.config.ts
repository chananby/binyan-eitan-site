import { defineConfig } from "vitest/config";

// Minimal config — the budget calc is pure functions (numbers in, numbers
// out), so a node environment with no DOM is all that's needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

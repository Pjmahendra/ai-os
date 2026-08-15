import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Only pure-logic unit tests live alongside source right now
    // (see README/PROGRESS notes on the DB integration test gap).
    exclude: [
      "**/node_modules/**",
      "**/dist/**"
    ]
  }
});

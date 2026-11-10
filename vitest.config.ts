import { defineConfig } from "vitest/config";

// Root runs the scaffolder's tests only. golden/ has its own config and CI.
export default defineConfig({
  test: { include: ["packages/**/test/**/*.test.ts", "scripts/**/*.test.ts"], passWithNoTests: true },
});

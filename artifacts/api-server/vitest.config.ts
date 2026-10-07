import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "production",
      LOG_LEVEL: "silent",
    },
    restoreMocks: false,
  },
});

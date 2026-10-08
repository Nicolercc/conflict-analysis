import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "production",
      LOG_LEVEL: "silent",
      GEOCODER_MIN_GAP_MS: "0",
      // Route tests answer every model call with a brief; the verifier has its own tests.
      BRIEF_VERIFY: "off",
      // Never used to call anything: the model client is replaced in every test that needs it.
      ANTHROPIC_API_KEY: "test-key-not-real",
    },
    restoreMocks: false,
  },
});

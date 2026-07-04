import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
    watch: {
      ignored: ["**/.codex-local/**"]
    }
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"]
  }
});

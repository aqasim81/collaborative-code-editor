import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "@collab-editor/shared": resolve(__dirname, "../../packages/shared/src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    passWithNoTests: true,
    // Placeholder values so modules importing lib/env.ts load under test. Not real credentials.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      AUTH_SECRET: "test-secret-test-secret-test-secret-00",
      AUTH_GITHUB_ID: "test-github-id",
      AUTH_GITHUB_SECRET: "test-github-secret",
      WS_TICKET_SECRET: "test-ticket-secret-test-ticket-secret-00",
      NEXT_PUBLIC_WS_URL: "ws://localhost:8080",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      LOG_LEVEL: "silent",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json", "html", "lcov"],
      include: ["lib/**", "components/**", "actions/**"],
      exclude: ["lib/env.ts", "components/ui/**", "**/*.test.*", "__tests__/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});

import { defineConfig, devices } from "@playwright/test";

// The production console and layout check (#37). Run by hand against `pnpm build && pnpm start` and a
// running WS server; not part of `make verify` or CI (it needs a database with a user). See e2e/.
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  reporter: "list",
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

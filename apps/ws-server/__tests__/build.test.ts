import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const appDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = fileURLToPath(new URL("../dist", import.meta.url));
const bundle = fileURLToPath(new URL("../dist/index.js", import.meta.url));

// Regression for #2: the build must emit a runnable bundle and must terminate
// (it must never start the server).
describe("ws-server build", () => {
  beforeAll(() => {
    rmSync(distDir, { recursive: true, force: true });
    execFileSync("pnpm", ["run", "build"], { cwd: appDir, stdio: "pipe", timeout: 60_000 });
  }, 90_000);

  it("emits dist/index.js", () => {
    expect(existsSync(bundle)).toBe(true);
  });

  it("emits valid JavaScript that Node can parse", () => {
    expect(() =>
      execFileSync(process.execPath, ["--check", bundle], { stdio: "pipe", timeout: 10_000 }),
    ).not.toThrow();
  });

  it("inlines the TypeScript-only shared package instead of importing it at runtime", () => {
    const code = readFileSync(bundle, "utf8");
    expect(code).not.toMatch(/["']@collab-editor\/shared["']/);
  });
});

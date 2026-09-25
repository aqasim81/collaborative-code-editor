import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Invariant 6: secrets stay out of the client. Client components must not import
// modules that read server environment variables or hold server-only clients.
const SERVER_ONLY_MODULES = [
  "@/lib/env",
  "@/lib/auth",
  "@/lib/auth.config",
  "@/lib/prisma",
  "@/lib/ws-ticket",
];
const SOURCE_DIRS = ["app", "components", "lib", "actions"];
const APP_ROOT = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function isClientModule(source: string): boolean {
  return /^\s*["']use client["']/.test(source);
}

function serverImports(source: string): string[] {
  return SERVER_ONLY_MODULES.filter((mod) =>
    new RegExp(`from\\s+["']${mod.replace(/[.]/g, "\\.")}["']`).test(source),
  );
}

function findViolations(files: { path: string; source: string }[]): string[] {
  return files
    .filter((file) => isClientModule(file.source))
    .flatMap((file) => serverImports(file.source).map((mod) => `${file.path} imports ${mod}`));
}

describe("client boundary (Invariant 6)", () => {
  it("detects a client component importing a server-only module", () => {
    const violations = findViolations([
      { path: "bad.tsx", source: '"use client";\nimport { env } from "@/lib/env";\n' },
      { path: "server.tsx", source: 'import { auth } from "@/lib/auth";\n' },
      { path: "ok.tsx", source: "'use client';\nimport { cn } from \"@/lib/utils\";\n" },
    ]);

    expect(violations).toEqual(["bad.tsx imports @/lib/env"]);
  });

  it("no client component in the app imports a server-only module", () => {
    const files = SOURCE_DIRS.flatMap((dir) => {
      try {
        return sourceFiles(join(APP_ROOT, dir));
      } catch {
        return [];
      }
    }).map((path) => ({ path: relative(APP_ROOT, path), source: readFileSync(path, "utf8") }));

    expect(files.length).toBeGreaterThan(0);
    expect(findViolations(files)).toEqual([]);
  });
});

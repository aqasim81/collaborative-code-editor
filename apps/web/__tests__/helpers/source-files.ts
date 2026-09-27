import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const APP_ROOT = join(__dirname, "..", "..");
// Skipped when reading the app from disk: dependencies, build output, tests, and (at the root only)
// the Prisma schema and seed.
const IGNORED_DIRS = new Set(["node_modules", ".next", ".turbo", "coverage", "__tests__"]);
const IGNORED_ROOT_DIRS = new Set(["prisma"]);

function readSourceFiles(dir: string): [string, string][] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry): [string, string][] => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const ignored =
        IGNORED_DIRS.has(entry.name) || (dir === APP_ROOT && IGNORED_ROOT_DIRS.has(entry.name));
      return ignored ? [] : readSourceFiles(path);
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith(".d.ts")) {
      return [];
    }
    return [[relative(APP_ROOT, path).split(sep).join("/"), readFileSync(path, "utf8")]];
  });
}

/** The web app's `.ts`/`.tsx` source as `[path, source]`, paths relative to the app root with forward slashes. */
export function readAppSourceFiles(): [string, string][] {
  return readSourceFiles(APP_ROOT);
}

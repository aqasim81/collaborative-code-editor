import { readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { join, posix, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Invariant 6: secrets stay out of the client. Every module that ends up in the client bundle must not
// be a server-only module. A module is client code when it has "use client" or when client code imports
// it, directly or transitively, so the check walks the import graph from each "use client" entry point.
// Package imports are not followed; each one reached from client code is checked against a denylist of
// server-only packages and Node builtins instead. The same walk runs from `middleware.ts` (edge runtime)
// and refuses the web logger and pino there (#54).
// Paths are relative to the web app root, with forward slashes.
const SERVER_ONLY_MODULES = new Set([
  "lib/env.ts",
  "lib/logger.ts",
  "lib/auth.ts",
  "lib/auth.config.ts",
  "lib/prisma.ts",
  "lib/room-purge.ts",
  "lib/rooms.ts",
  "lib/ws-ticket.ts",
]);
// Server-only packages, matched as the specifier itself or any subpath of it.
const SERVER_ONLY_PACKAGES = [
  "@prisma/client",
  "@auth/prisma-adapter",
  "jose",
  "next-auth/providers",
  "next/headers",
  "pino",
];
const NODE_BUILTINS = new Set(builtinModules);
const APP_ROOT = join(__dirname, "..", "..");
// Skipped when reading the app from disk: dependencies, build output, tests, and (at the root only)
// the Prisma schema and seed.
const IGNORED_DIRS = new Set(["node_modules", ".next", ".turbo", "coverage", "__tests__"]);
const IGNORED_ROOT_DIRS = new Set(["prisma"]);
const RESOLVE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];
// Local imports of non-code assets (e.g. "./globals.css") are not modules in the graph.
const ASSET_SPECIFIER = /\.(css|scss|svg|png|jpe?g|gif|webp|ico|woff2?)$/;

type SourceFiles = ReadonlyMap<string, string>;

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

function hasDirective(source: string, directive: string): boolean {
  return new RegExp(`^(?:\\s|//[^\\n]*\\n|/\\*[\\s\\S]*?\\*/)*["']${directive}["']`).test(source);
}

// Server-only: a listed module, a module marked with `import "server-only"`, or a module that reads a
// non-public environment variable directly.
function isServerOnly(path: string, source: string): boolean {
  return (
    SERVER_ONLY_MODULES.has(path) ||
    /\bimport\s*["']server-only["']/.test(source) ||
    /\bprocess\.env(?:\.(?!NEXT_PUBLIC_)\w|\[)/.test(source)
  );
}

// Specifiers of imports that survive compilation. `import type` / `export type` are erased and never
// reach the bundle, so they are not edges. Comments are stripped first.
function importSpecifiers(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const patterns = [
    /\bimport\s+(?!type\s)[^"';]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bexport\s+(?!type\s)[^"';]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  return patterns.flatMap((pattern) =>
    [...code.matchAll(pattern)].flatMap((match) => (match[1] ? [match[1]] : [])),
  );
}

function isNodeBuiltin(specifier: string): boolean {
  return specifier.startsWith("node:") || NODE_BUILTINS.has(specifier);
}

function isServerOnlyPackage(specifier: string): boolean {
  return (
    // The bare "next-auth" is the server entry; "next-auth/react" is client code.
    specifier === "next-auth" ||
    SERVER_ONLY_PACKAGES.some((name) => specifier === name || specifier.startsWith(`${name}/`)) ||
    isNodeBuiltin(specifier)
  );
}

// Resolves "./x", "../x" and "@/x" (with or without a .js/.jsx extension) to a file in the app.
// Returns null for package imports and assets, undefined for a local specifier that does not resolve.
function resolveSpecifier(
  from: string,
  specifier: string,
  files: SourceFiles,
): string | null | undefined {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = specifier.slice(2);
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = posix.join(posix.dirname(from), specifier);
  } else {
    return null;
  }
  if (ASSET_SPECIFIER.test(base)) {
    return null;
  }
  const stripped = base.replace(/\.jsx?$/, "");
  return RESOLVE_SUFFIXES.map((suffix) => posix.normalize(stripped + suffix)).find((candidate) =>
    files.has(candidate),
  );
}

// What a walk refuses, and where it stops following imports.
type BoundaryRule = {
  isDeniedModule: (path: string, source: string) => boolean;
  isDeniedPackage: (specifier: string) => boolean;
  // Whether the imports of a non-entry module are left out of the graph.
  stopsAt: (source: string) => boolean;
};

// Client code: no server-only module or package. A "use server" module reaches the client only as
// action references; its imports stay on the server.
const CLIENT_RULE: BoundaryRule = {
  isDeniedModule: isServerOnly,
  isDeniedPackage: isServerOnlyPackage,
  stopsAt: (source) => hasDirective(source, "use server"),
};

// middleware.ts runs on the edge runtime, where Node builtins, and so pino, don't exist (#54). Middleware is
// server code, so `lib/auth.config.ts` and `lib/env.ts` are fine there; the logger is refused.
const MIDDLEWARE_ENTRY = "middleware.ts";
const MIDDLEWARE_RULE: BoundaryRule = {
  isDeniedModule: (path) => path === "lib/logger.ts",
  isDeniedPackage: (specifier) =>
    specifier === "pino" || specifier.startsWith("pino/") || isNodeBuiltin(specifier),
  stopsAt: () => false,
};

// Breadth-first walk from each entry point. Returns the modules reached and the violations, each as the
// import chain from the entry. A local import that cannot be resolved is a violation too, so a missed file
// can never make the check pass silently.
function walkGraph(
  files: SourceFiles,
  entries: readonly string[],
  rule: BoundaryRule,
): { reached: Set<string>; violations: string[] } {
  const reached = new Set<string>();
  const violations: string[] = [];

  for (const entry of entries) {
    const visited = new Set<string>([entry]);
    const queue: string[][] = [[entry]];
    while (queue.length > 0) {
      const chain = queue.shift() ?? [];
      const current = chain[chain.length - 1] ?? "";
      const source = files.get(current) ?? "";
      reached.add(current);
      if (rule.isDeniedModule(current, source)) {
        violations.push(chain.join(" -> "));
        continue;
      }
      if (current !== entry && rule.stopsAt(source)) {
        continue;
      }
      for (const specifier of importSpecifiers(source)) {
        const target = resolveSpecifier(current, specifier, files);
        if (target === undefined) {
          violations.push(`${chain.join(" -> ")} -> unresolved "${specifier}"`);
        } else if (target === null && rule.isDeniedPackage(specifier)) {
          violations.push(`${chain.join(" -> ")} -> package "${specifier}"`);
        } else if (target !== null && !visited.has(target)) {
          visited.add(target);
          queue.push([...chain, target]);
        }
      }
    }
  }
  return { reached, violations };
}

// Every "use client" module is an entry point of the client graph.
function walkClientGraph(files: SourceFiles): { reached: Set<string>; violations: string[] } {
  const entries = [...files]
    .filter(([, source]) => hasDirective(source, "use client"))
    .map(([path]) => path);
  return walkGraph(files, entries, CLIENT_RULE);
}

function walkMiddlewareGraph(files: SourceFiles): { reached: Set<string>; violations: string[] } {
  return walkGraph(files, [MIDDLEWARE_ENTRY], MIDDLEWARE_RULE);
}

// The app's source, read from disk once for the real-app walks.
let appFiles: SourceFiles | undefined;
function readAppFiles(): SourceFiles {
  appFiles ??= new Map(readSourceFiles(APP_ROOT));
  return appFiles;
}

function findViolations(files: SourceFiles): string[] {
  return walkClientGraph(files).violations;
}

describe("client boundary (Invariant 6)", () => {
  const OK_UTILS = 'export const cn = (...c: string[]) => c.join(" ");\n';
  const ENV = "export const env = { SECRET: process.env.SECRET };\n";

  it("flags an @/ server-only import in a client component", () => {
    const files = new Map([
      ["components/bad.tsx", '"use client";\nimport { env } from "@/lib/env";\n'],
      ["components/ok.tsx", "'use client';\nimport { cn } from \"@/lib/utils\";\n"],
      ["app/page.tsx", 'import { auth } from "@/lib/auth";\n'],
      ["lib/env.ts", ENV],
      ["lib/auth.ts", "export const auth = () => null;\n"],
      ["lib/utils.ts", OK_UTILS],
    ]);

    expect(findViolations(files)).toEqual(["components/bad.tsx -> lib/env.ts"]);
  });

  it("flags a relative server-only import in a client component (#16)", () => {
    const files = new Map([
      ["components/editor/bad.tsx", '"use client";\nimport { env } from "../../lib/env";\n'],
      ["lib/env.ts", ENV],
    ]);

    expect(findViolations(files)).toEqual(["components/editor/bad.tsx -> lib/env.ts"]);
  });

  it("flags a server-only import in a directive-less module a client component imports (#16, #21)", () => {
    const files = new Map([
      [
        "components/editor/room-editor.tsx",
        '"use client";\nimport { Toolbar } from "./toolbar";\n',
      ],
      [
        "components/editor/toolbar.tsx",
        'import { prisma } from "@/lib/prisma";\nexport const Toolbar = 1;\n',
      ],
      ["lib/prisma.ts", "export const prisma = {};\n"],
    ]);

    expect(findViolations(files)).toEqual([
      "components/editor/room-editor.tsx -> components/editor/toolbar.tsx -> lib/prisma.ts",
    ]);
  });

  it("flags a server-only import reached transitively through several modules (#21)", () => {
    const files = new Map([
      [
        "components/room/room-provider.tsx",
        '"use client";\nimport { connect } from "@/lib/yjs";\n',
      ],
      ["lib/yjs/index.ts", 'export { connect } from "./provider";\n'],
      [
        "lib/yjs/provider.ts",
        'import { signRoomTicket } from "../ws-ticket";\nexport const connect = 1;\n',
      ],
      ["lib/ws-ticket.ts", "export const signRoomTicket = 1;\n"],
    ]);

    expect(findViolations(files)).toEqual([
      "components/room/room-provider.tsx -> lib/yjs/index.ts -> lib/yjs/provider.ts -> lib/ws-ticket.ts",
    ]);
  });

  it('flags a module marked with import "server-only" and dynamic imports', () => {
    const files = new Map([
      ["components/lazy.tsx", '"use client";\nconst m = () => import("../lib/secret");\n'],
      ["lib/secret.ts", 'import "server-only";\nexport const key = 1;\n'],
    ]);

    expect(findViolations(files)).toEqual(["components/lazy.tsx -> lib/secret.ts"]);
  });

  it('does not follow type-only imports or the imports of a "use server" module', () => {
    const files = new Map([
      [
        "components/room.tsx",
        '"use client";\nimport { getTicket } from "@/actions/ticket";\nimport type { Env } from "@/lib/env";\n',
      ],
      [
        "actions/ticket.ts",
        '"use server";\nimport { env } from "@/lib/env";\nexport async function getTicket() {}\n',
      ],
      ["lib/env.ts", ENV],
    ]);

    expect(findViolations(files)).toEqual([]);
  });

  it("flags direct non-public env reads, .js specifiers and unresolved local imports", () => {
    const files = new Map([
      [
        "components/a.tsx",
        '"use client";\nimport {x}from"./helper.js";\nimport "./globals.css";\nimport { y } from "./missing";\n',
      ],
      ["components/helper.ts", "export const x = process.env.AUTH_SECRET;\n"],
      [
        "components/public.tsx",
        '"use client";\nexport const u = process.env.NEXT_PUBLIC_WS_URL;\n',
      ],
    ]);

    expect(findViolations(files)).toEqual([
      'components/a.tsx -> unresolved "./missing"',
      "components/a.tsx -> components/helper.ts",
    ]);
  });

  it("flags a server-only package imported by a client component", () => {
    const files = new Map([
      ["components/a.tsx", '"use client";\nimport { PrismaClient } from "@prisma/client";\n'],
      [
        "components/b.tsx",
        '"use client";\nimport { PrismaAdapter } from "@auth/prisma-adapter";\nimport NextAuth from "next-auth";\n',
      ],
      ["components/c.tsx", '"use client";\nimport GitHub from "next-auth/providers/github";\n'],
    ]);

    expect(findViolations(files)).toEqual([
      'components/a.tsx -> package "@prisma/client"',
      'components/b.tsx -> package "@auth/prisma-adapter"',
      'components/b.tsx -> package "next-auth"',
      'components/c.tsx -> package "next-auth/providers/github"',
    ]);
  });

  it("flags a server-only package reached transitively and Node builtins", () => {
    const files = new Map([
      ["components/a.tsx", '"use client";\nimport { sign } from "@/lib/helper";\n'],
      ["lib/helper.ts", 'import { SignJWT } from "jose";\nexport const sign = SignJWT;\n'],
      [
        "components/b.tsx",
        '"use client";\nimport { randomBytes } from "node:crypto";\nimport { createHash } from "crypto";\nimport { readFile } from "fs/promises";\n',
      ],
    ]);

    expect(findViolations(files)).toEqual([
      'components/a.tsx -> lib/helper.ts -> package "jose"',
      'components/b.tsx -> package "node:crypto"',
      'components/b.tsx -> package "crypto"',
      'components/b.tsx -> package "fs/promises"',
    ]);
  });

  it("flags the web logger and pino in client code (#51)", () => {
    const files = new Map([
      ["components/a.tsx", '"use client";\nimport { logger } from "@/lib/logger";\n'],
      ["components/b.tsx", '"use client";\nimport pino from "pino";\n'],
      ["lib/logger.ts", "export const logger = {};\n"],
    ]);

    expect(findViolations(files)).toEqual([
      "components/a.tsx -> lib/logger.ts",
      'components/b.tsx -> package "pino"',
    ]);
  });

  it("allows client packages and type-only imports of server-only packages", () => {
    const files = new Map([
      [
        "components/a.tsx",
        '"use client";\nimport { useSession } from "next-auth/react";\nimport type { Room } from "@prisma/client";\nimport { useRouter } from "next/navigation";\nimport * as Y from "yjs";\nimport { z } from "zod";\n',
      ],
    ]);

    expect(findViolations(files)).toEqual([]);
  });

  it("no module reachable from a client component in the app is server-only", () => {
    const files = readAppFiles();
    const { reached, violations } = walkClientGraph(files);

    // Guard against a walk that silently stops: directive-less modules imported by client components
    // must be part of the client graph.
    expect(reached).toContain("components/editor/toolbar.tsx");
    expect(reached).toContain("lib/yjs/provider.ts");
    expect(violations).toEqual([]);
  });

  it("flags the web logger, pino and Node builtins reached from middleware, and allows auth.config and env (#54)", () => {
    const files = new Map([
      [
        "middleware.ts",
        'import NextAuth from "next-auth";\nimport { authConfig } from "@/lib/auth.config";\nimport { log } from "@/lib/helper";\nimport pino from "pino";\nimport { randomUUID } from "node:crypto";\n',
      ],
      ["lib/auth.config.ts", 'import { env } from "@/lib/env";\nexport const authConfig = {};\n'],
      ["lib/env.ts", ENV],
      ["lib/helper.ts", 'import { logger } from "./logger";\nexport const log = logger;\n'],
      ["lib/logger.ts", "export const logger = {};\n"],
    ]);

    expect(walkMiddlewareGraph(files).violations).toEqual([
      'middleware.ts -> package "pino"',
      'middleware.ts -> package "node:crypto"',
      "middleware.ts -> lib/helper.ts -> lib/logger.ts",
    ]);
  });

  it("the app's middleware does not reach the web logger or pino (#54)", () => {
    const files = readAppFiles();
    const { reached, violations } = walkMiddlewareGraph(files);

    // Guard against a walk that never starts: the middleware must reach its auth config.
    expect(reached).toContain("lib/auth.config.ts");
    expect(violations).toEqual([]);
  });
});

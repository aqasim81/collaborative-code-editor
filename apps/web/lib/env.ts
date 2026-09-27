import { z } from "zod";
import type { Result } from "@/lib/result";

// Server-only: import this from server code (Server Components, actions, route handlers, config).
// Client components read NEXT_PUBLIC_* values, which Next.js inlines at build time.

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => /^postgres(ql)?:\/\//.test(value), "must be a postgresql:// URL"),
  AUTH_SECRET: z.string().min(32, "must be at least 32 characters (openssl rand -hex 32)"),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  // Signs the short-lived room tickets the WS server verifies; must match the WS server's value.
  WS_TICKET_SECRET: z.string().min(32, "must be at least 32 characters (openssl rand -hex 32)"),
  // The WS server's base URL for server-to-server calls (room purges, #48), when the web app reaches it
  // on another address than browsers do. Unset: derived from NEXT_PUBLIC_WS_URL.
  WS_SERVER_URL: z
    .string()
    .url()
    .refine((value) => /^(http|ws)s?:\/\//.test(value), "must be an http(s):// or ws(s):// URL")
    .optional(),
  NEXT_PUBLIC_WS_URL: z
    .string()
    .url()
    .refine((value) => /^wss?:\/\//.test(value), "must be a ws:// or wss:// URL"),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

/** Every variable the schema reads; `.env.example` must list each one except NODE_ENV. */
export const ENV_KEYS = Object.keys(envSchema.shape);

export type EnvResult = Result<Env>;

/** Validates an environment source. Empty strings count as missing. */
export function parseEnv(source: Record<string, string | undefined>): EnvResult {
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value !== ""),
  );
  const result = envSchema.safeParse(cleaned);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
  return { success: false, error: `Invalid environment variables:\n${issues.join("\n")}` };
}

/**
 * The WS server's HTTP base URL for server-to-server calls: `WS_SERVER_URL` if set, else
 * `NEXT_PUBLIC_WS_URL`, with `ws:` mapped to `http:` and `wss:` to `https:`.
 */
export function wsServerHttpUrl(source: Pick<Env, "WS_SERVER_URL" | "NEXT_PUBLIC_WS_URL">): string {
  return (source.WS_SERVER_URL ?? source.NEXT_PUBLIC_WS_URL).replace(/^ws/, "http");
}

function loadEnv(): Env {
  const result = parseEnv(process.env);
  if (!result.success) {
    // Fail fast at build/boot: a misconfigured deployment must never start.
    throw new Error(result.error);
  }
  return result.data;
}

export const env = loadEnv();

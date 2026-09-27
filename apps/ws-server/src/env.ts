import { LOG_LEVELS } from "@collab-editor/shared";
import { z } from "zod";
import { parseTrustedProxy, type TrustedProxy } from "./client-address";
import type { Result } from "./result";

const envSchema = z.object({
  WS_SERVER_PORT: z.coerce.number().int().min(0).max(65_535).default(8080),
  WS_TICKET_SECRET: z.string().min(32, "must be at least 32 characters (openssl rand -hex 32)"),
  // Directory of the LevelDB document store; relative paths resolve against the working directory.
  WS_PERSISTENCE_DIR: z.string().min(1).default(".leveldb"),
  ROOM_GRACE_PERIOD_MS: z.coerce.number().int().min(0).default(30_000),
  // Comma-separated IPs/CIDRs of the reverse proxies in front of the server; unset trusts none (#30).
  WS_TRUSTED_PROXIES: z
    .string()
    .default("")
    .transform((value, ctx) => {
      const proxies: TrustedProxy[] = [];
      for (const entry of value ? value.split(",") : []) {
        const parsed = parseTrustedProxy(entry);
        if (parsed.success) {
          proxies.push(parsed.data);
        } else {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${entry}": ${parsed.error}` });
        }
      }
      return proxies;
    }),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

/** Every variable the schema reads; `.env.example` must list each one except NODE_ENV. */
export const ENV_KEYS = Object.keys(envSchema.shape);

/** Validates an environment source. Empty strings count as missing. */
export function parseEnv(source: Record<string, string | undefined>): Result<Env> {
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

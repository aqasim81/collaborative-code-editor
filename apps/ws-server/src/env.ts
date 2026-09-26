import { z } from "zod";
import type { Result } from "./result";

const envSchema = z.object({
  WS_SERVER_PORT: z.coerce.number().int().min(0).max(65_535).default(8080),
  WS_TICKET_SECRET: z.string().min(32, "must be at least 32 characters (openssl rand -hex 32)"),
  // Directory of the LevelDB document store; relative paths resolve against the working directory.
  WS_PERSISTENCE_DIR: z.string().min(1).default(".leveldb"),
  ROOM_GRACE_PERIOD_MS: z.coerce.number().int().min(0).default(30_000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

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

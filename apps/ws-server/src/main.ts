import { createTrustedProxies } from "./client-address";
import { parseEnv } from "./env";
import { createLogger } from "./logger";
import { openLevelDbStore } from "./persistence/document-store";
import type { Result } from "./result";
import { type RunningServer, startServer } from "./server";

export interface ProcessLike {
  on(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
  exit(code: number): void;
}

/** Validates the environment, starts the server and wires graceful shutdown to SIGINT/SIGTERM. */
export async function main(
  source: Record<string, string | undefined>,
  proc: ProcessLike,
): Promise<Result<RunningServer>> {
  const env = parseEnv(source);
  if (!env.success) {
    return env;
  }
  const logger = createLogger(env.data.LOG_LEVEL);

  const store = await openLevelDbStore(env.data.WS_PERSISTENCE_DIR);
  if (!store.success) {
    return store;
  }

  const started = await startServer({
    port: env.data.WS_SERVER_PORT,
    ticketSecret: env.data.WS_TICKET_SECRET,
    roomGracePeriodMs: env.data.ROOM_GRACE_PERIOD_MS,
    logger,
    store: store.data,
    trustedProxies: createTrustedProxies(env.data.WS_TRUSTED_PROXIES),
  });
  if (!started.success) {
    await store.data.close();
    return started;
  }
  const server = started.data;
  logger.info(
    {
      port: server.port,
      persistenceDir: env.data.WS_PERSISTENCE_DIR,
      trustedProxies: env.data.WS_TRUSTED_PROXIES.length,
    },
    "ws server listening",
  );

  let stopping = false;
  const shutdown = (signal: string): void => {
    if (stopping) {
      return;
    }
    stopping = true;
    logger.info({ signal }, "shutting down");
    void server.close().then(() => {
      logger.info("shutdown complete");
      proc.exit(0);
    });
  };
  proc.on("SIGINT", () => shutdown("SIGINT"));
  proc.on("SIGTERM", () => shutdown("SIGTERM"));

  return started;
}

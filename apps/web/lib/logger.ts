import { LOG_REDACT_PATHS } from "@collab-editor/shared";
import pino, { type DestinationStream, type Logger } from "pino";
import { env } from "@/lib/env";

/**
 * Structured JSON logs through pino, like the WS server's. Server-only (it reads `lib/env.ts`; the
 * client-boundary test refuses it and `pino` in client code), and never imported from `middleware.ts`,
 * which runs on the edge runtime where pino's Node dependencies don't exist (the same test walks the
 * middleware graph). Ticket, authorization and cookie fields are redacted, and a request logged as `req` goes
 * through the standard serializer (no `rawHeaders`); still, never log tickets or secrets.
 * `destination` defaults to stdout (tests pass a capture stream).
 */
export function createWebLogger(level: string, destination?: DestinationStream): Logger {
  return pino(
    {
      name: "web",
      level,
      redact: [...LOG_REDACT_PATHS],
      serializers: { req: pino.stdSerializers.req },
    },
    destination,
  );
}

export const logger = createWebLogger(env.LOG_LEVEL);

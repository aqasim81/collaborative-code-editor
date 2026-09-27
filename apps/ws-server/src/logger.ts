import { LOG_REDACT_PATHS } from "@collab-editor/shared";
import pino, { type DestinationStream, type Logger } from "pino";

export type { Logger };

/**
 * Structured JSON logs through pino; the server never writes to the console directly. Ticket,
 * authorization and cookie fields are redacted, and a request logged as `req` goes through the standard
 * serializer (no socket, no `rawHeaders`). `destination` defaults to stdout (tests pass a capture stream).
 */
export function createLogger(level: string, destination?: DestinationStream): Logger {
  return pino(
    {
      name: "ws-server",
      level,
      redact: [...LOG_REDACT_PATHS],
      serializers: { req: pino.stdSerializers.req },
    },
    destination,
  );
}

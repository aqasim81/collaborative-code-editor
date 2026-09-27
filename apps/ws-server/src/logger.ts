import { LOG_REDACT_PATHS } from "@collab-editor/shared";
import pino, { type DestinationStream, type Logger } from "pino";

export type { Logger };

/**
 * Structured JSON logs through pino; the server never writes to the console directly. Ticket and
 * authorization fields are redacted. `destination` defaults to stdout (tests pass a capture stream).
 */
export function createLogger(level: string, destination?: DestinationStream): Logger {
  return pino({ name: "ws-server", level, redact: [...LOG_REDACT_PATHS] }, destination);
}

import pino, { type Logger } from "pino";

export type { Logger };

/** Structured JSON logs through pino; the server never writes to the console directly. */
export function createLogger(level: string): Logger {
  return pino({ name: "ws-server", level });
}

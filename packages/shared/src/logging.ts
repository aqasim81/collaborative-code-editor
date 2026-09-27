/** pino levels both apps accept in `LOG_LEVEL`; one list, so one `.env` validates in both. */
export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

/**
 * pino `redact` paths both apps set, so a ticket, bearer token or `Authorization` header passed to a log call
 * by mistake prints as `[Redacted]`. Matching is case-sensitive and `*` matches one level, so both header
 * spellings are listed (Node lowercases incoming headers; outgoing `fetch` headers keep their case) at the top
 * level and one level down. A safety net only: call sites still never log secrets.
 */
export const LOG_REDACT_PATHS = [
  "ticket",
  "*.ticket",
  "token",
  "*.token",
  "authorization",
  "*.authorization",
  "*.headers.authorization",
  "Authorization",
  "*.Authorization",
  "*.headers.Authorization",
  'headers["sec-websocket-protocol"]',
  '*.headers["sec-websocket-protocol"]',
  'headers["Sec-WebSocket-Protocol"]',
  '*.headers["Sec-WebSocket-Protocol"]',
] as const;

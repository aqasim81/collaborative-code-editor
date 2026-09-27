/** pino levels both apps accept in `LOG_LEVEL`; one list, so one `.env` validates in both. */
export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

/**
 * pino `redact` paths both apps set, so a ticket, bearer token, `Authorization` header or cookie (the Auth.js
 * session JWT) passed to a log call by mistake prints as `[Redacted]`. Matching is case-sensitive and `*`
 * matches one level, so both header spellings are listed (Node lowercases incoming headers; outgoing `fetch`
 * headers keep their case) at the top level and one level down. A Node request's `rawHeaders` array repeats
 * its headers, and paths can't name array entries, so it is redacted whole. `cookies` and the Auth.js session
 * cookie names (dotted, so in brackets) are redacted as keys too. A safety net only: call sites still never
 * log secrets, and log a request as `req` and a response as `res` so the loggers' serializers apply.
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
  "cookie",
  "*.cookie",
  "*.headers.cookie",
  "Cookie",
  "*.Cookie",
  "*.headers.Cookie",
  'headers["set-cookie"]',
  '*.headers["set-cookie"]',
  'headers["Set-Cookie"]',
  '*.headers["Set-Cookie"]',
  "cookies",
  "*.cookies",
  '["authjs.session-token"]',
  '*["authjs.session-token"]',
  '["__Secure-authjs.session-token"]',
  '*["__Secure-authjs.session-token"]',
  "rawHeaders",
  "*.rawHeaders",
] as const;

import pino from "pino";
import { env } from "@/lib/env";

/**
 * Structured JSON logs through pino, like the WS server's. Server-only (it reads `lib/env.ts`; the
 * client-boundary test refuses it and `pino` in client code), and never imported from `middleware.ts`,
 * which runs on the edge runtime where pino's Node dependencies don't exist. Never log tickets or secrets.
 */
export const logger = pino({ name: "web", level: env.LOG_LEVEL });

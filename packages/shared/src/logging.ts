/** pino levels both apps accept in `LOG_LEVEL`; one list, so one `.env` validates in both. */
export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

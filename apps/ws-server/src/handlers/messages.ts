import type { ClientMessage } from "@collab-editor/shared";
import { z } from "zod";
import type { Result } from "../result";

const clientMessageSchema: z.ZodType<ClientMessage> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }).strict(),
]);

/**
 * Validates an inbound frame (Invariant 1). Binary frames are reserved for Yjs sync (Phase 5) and are
 * rejected until then.
 */
export function parseClientMessage(data: Buffer, isBinary: boolean): Result<ClientMessage> {
  if (isBinary) {
    return { success: false, error: "binary messages are not supported yet" };
  }
  let json: unknown;
  try {
    json = JSON.parse(data.toString("utf8"));
  } catch {
    return { success: false, error: "message is not valid JSON" };
  }
  const parsed = clientMessageSchema.safeParse(json);
  if (!parsed.success) {
    return { success: false, error: "unknown or malformed message" };
  }
  return { success: true, data: parsed.data };
}

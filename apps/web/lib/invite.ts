import { randomBytes } from "node:crypto";
import { z } from "zod";
import { invitePath } from "@/lib/routes";

// Secret invite links (ADR 0003). The token is a bearer secret: whoever holds it can join the room as
// an EDITOR, so it is only ever shown to the room's owner. Server-only (node:crypto).

/** 32 random bytes: 256 bits, too many to guess, so `/join` needs no rate limit. */
export const INVITE_TOKEN_BYTES = 32;

/** base64url without padding of `INVITE_TOKEN_BYTES` bytes: always 43 characters. */
export const inviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

/** The absolute invite link on the site's own origin. */
export function inviteUrl(token: string, siteUrl: string): string {
  return new URL(invitePath(token), siteUrl).toString();
}

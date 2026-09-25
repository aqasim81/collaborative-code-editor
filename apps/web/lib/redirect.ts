import { z } from "zod";
import { DEFAULT_REDIRECT_PATH } from "@/lib/routes";

const callbackSchema = z.string().trim().min(1).max(2048);

/**
 * Turns an untrusted callbackUrl into a same-origin path, or the default redirect.
 * Accepts relative paths ("/room/1") and absolute URLs on the site's own origin
 * (the middleware sends the full URL). Anything else falls back, including "//host" and
 * same-origin URLs whose path starts with "//", which a later redirect would read as a host.
 */
export function safeCallbackPath(value: unknown, siteUrl: string): string {
  const parsed = callbackSchema.safeParse(value);
  if (!parsed.success) {
    return DEFAULT_REDIRECT_PATH;
  }
  const site = new URL(siteUrl);
  let target: URL;
  try {
    target = new URL(parsed.data, site);
  } catch {
    return DEFAULT_REDIRECT_PATH;
  }
  if (target.origin !== site.origin || target.pathname.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }
  return `${target.pathname}${target.search}${target.hash}`;
}

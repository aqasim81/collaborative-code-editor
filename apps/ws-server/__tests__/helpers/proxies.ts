import {
  createTrustedProxies,
  parseTrustedProxy,
  type TrustedProxies,
} from "../../src/client-address";

/** Trusted proxies from `WS_TRUSTED_PROXIES`-style entries; throws on an invalid one. */
export function trust(...entries: string[]): TrustedProxies {
  return createTrustedProxies(
    entries.map((entry) => {
      const parsed = parseTrustedProxy(entry);
      if (!parsed.success) {
        throw new Error(parsed.error);
      }
      return parsed.data;
    }),
  );
}

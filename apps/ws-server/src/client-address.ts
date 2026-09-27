import { BlockList, isIP } from "node:net";
import type { Result } from "./result";

/** A reverse proxy (or range of them) whose `X-Forwarded-For` header is believed. */
export interface TrustedProxy {
  address: string;
  prefix: number;
  family: "ipv4" | "ipv6";
}

export interface TrustedProxies {
  has(address: string | undefined): boolean;
}

/**
 * Drops an IPv6 zone id and unwraps IPv4-mapped IPv6 (how a dual-stack listener reports IPv4 peers), in
 * any spelling: dotted (`::ffff:1.2.3.4`), hex (`::ffff:102:304`) or expanded.
 */
export function normaliseAddress(address: string): string {
  const zone = address.indexOf("%");
  const unzoned = zone === -1 ? address : address.slice(0, zone);
  if (isIP(unzoned) !== 6) {
    return unzoned;
  }
  // The URL parser writes IPv6 canonically, so every spelling of a mapped address reads the same.
  const canonical = new URL(`http://[${unzoned}]`).hostname;
  const [, high, low] = /^\[::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})\]$/.exec(canonical) ?? [];
  if (high === undefined || low === undefined) {
    return unzoned;
  }
  const bits = (Number.parseInt(high, 16) << 16) | Number.parseInt(low, 16);
  return [bits >>> 24, (bits >>> 16) & 255, (bits >>> 8) & 255, bits & 255].join(".");
}

function familyOf(address: string): TrustedProxy["family"] | undefined {
  const version = isIP(address);
  if (version === 0) {
    return undefined;
  }
  return version === 4 ? "ipv4" : "ipv6";
}

/** Wider ranges trust too much: any client inside one could choose its rate-limit bucket. */
const MIN_PREFIX = 8;
/** `::ffff:0:0/96`, where a dual-stack listener reports IPv4 peers. */
const IPV4_MAPPED = "::ffff:0:0";
const IPV4_MAPPED_PREFIX = 96;
const COVERS_IPV4_MAPPED = "covers every IPv4-mapped address; list IPv4 proxies in IPv4 form";

function coversIpv4Mapped(address: string, prefix: number): boolean {
  const range = new BlockList();
  range.addSubnet(address, prefix, "ipv6");
  return range.check(IPV4_MAPPED, "ipv6");
}

/** Parses one `WS_TRUSTED_PROXIES` entry: an IPv4/IPv6 address, optionally followed by `/prefix`. */
export function parseTrustedProxy(entry: string): Result<TrustedProxy> {
  const trimmed = entry.trim();
  if (!trimmed) {
    return { success: false, error: "empty entry" };
  }
  const slash = trimmed.lastIndexOf("/");
  const written = slash === -1 ? trimmed : trimmed.slice(0, slash);
  let family = familyOf(written);
  if (!family) {
    return { success: false, error: "not an IP address or CIDR range" };
  }
  const bits = family === "ipv4" ? 32 : 128;
  const prefixText = slash === -1 ? String(bits) : trimmed.slice(slash + 1);
  let prefix = Number(prefixText);
  if (!/^\d{1,3}$/.test(prefixText) || prefix > bits) {
    return { success: false, error: `prefix must be an integer from ${MIN_PREFIX} to ${bits}` };
  }
  const address = normaliseAddress(written);
  // An IPv4-mapped range is the IPv4 range it maps; one wider than the mapped block covers all of it.
  if (family === "ipv6" && !address.includes(":")) {
    if (prefix < IPV4_MAPPED_PREFIX) {
      return { success: false, error: COVERS_IPV4_MAPPED };
    }
    family = "ipv4";
    prefix -= IPV4_MAPPED_PREFIX;
  }
  if (prefix < MIN_PREFIX) {
    return {
      success: false,
      error: `ranges wider than /${MIN_PREFIX} let clients inside them choose their rate-limit bucket`,
    };
  }
  if (family === "ipv6" && coversIpv4Mapped(address, prefix)) {
    return { success: false, error: COVERS_IPV4_MAPPED };
  }
  return { success: true, data: { address, prefix, family } };
}

export const NO_TRUSTED_PROXIES: TrustedProxies = { has: () => false };

export function createTrustedProxies(entries: readonly TrustedProxy[]): TrustedProxies {
  if (entries.length === 0) {
    return NO_TRUSTED_PROXIES;
  }
  const list = new BlockList();
  for (const { address, prefix, family } of entries) {
    list.addSubnet(address, prefix, family);
  }
  return {
    has(address) {
      const normalised = normaliseAddress(address ?? "");
      const family = familyOf(normalised);
      return family !== undefined && list.check(normalised, family);
    },
  };
}

/**
 * The address a request comes from. `X-Forwarded-For` is client-controlled, so it is read only when the
 * socket peer is a trusted proxy, and then only from the right: each trusted proxy appends the address it
 * saw, so the rightmost hop that is not itself a trusted proxy is the client. Anything to its left was
 * written by the client. A malformed hop, a missing header or an all-trusted chain gives the peer.
 */
export function clientAddress(
  remoteAddress: string | undefined,
  forwardedFor: string | readonly string[] | undefined,
  trusted: TrustedProxies,
): string | undefined {
  if (!trusted.has(remoteAddress)) {
    return remoteAddress;
  }
  // Only the hops actually visited are normalised: the header can hold thousands of client-written ones.
  // Repeated headers are one list, in order (Node joins them into one string already).
  const header = typeof forwardedFor === "string" ? forwardedFor : (forwardedFor ?? []).join(",");
  for (const raw of header.split(",").reverse()) {
    const hop = normaliseAddress(raw.trim());
    if (!familyOf(hop)) {
      return remoteAddress;
    }
    if (!trusted.has(hop)) {
      return hop;
    }
  }
  return remoteAddress;
}

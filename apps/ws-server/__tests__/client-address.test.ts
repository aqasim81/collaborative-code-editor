import { describe, expect, it } from "vitest";
import {
  clientAddress,
  createTrustedProxies,
  NO_TRUSTED_PROXIES,
  parseTrustedProxy,
  type TrustedProxy,
} from "../src/client-address";
import { trust } from "./helpers/proxies";

describe("parseTrustedProxy", () => {
  it.each<[string, TrustedProxy]>([
    ["127.0.0.1", { address: "127.0.0.1", prefix: 32, family: "ipv4" }],
    [" 10.0.0.0/8 ", { address: "10.0.0.0", prefix: 8, family: "ipv4" }],
    ["::1", { address: "::1", prefix: 128, family: "ipv6" }],
    ["fd00::/8", { address: "fd00::", prefix: 8, family: "ipv6" }],
    ["::ffff:10.0.0.1", { address: "10.0.0.1", prefix: 32, family: "ipv4" }],
    ["fe80::1%eth0", { address: "fe80::1", prefix: 128, family: "ipv6" }],
    ["::ffff:a00:0/104", { address: "10.0.0.0", prefix: 8, family: "ipv4" }],
    ["::ffff:10.0.0.0/120", { address: "10.0.0.0", prefix: 24, family: "ipv4" }],
  ])("accepts %j", (entry, expected) => {
    expect(parseTrustedProxy(entry)).toEqual({ success: true, data: expected });
  });

  it.each([
    ["", "empty"],
    ["  ", "empty"],
    ["proxy.internal", "not an IP address"],
    ["10.0.0.1:80", "not an IP address"],
    ["[::1]:80", "not an IP address"],
    ["10.0.0.0/33", "prefix"],
    ["::/129", "prefix"],
    ["10.0.0.0/x", "prefix"],
    ["10.0.0.0/", "prefix"],
    ["10.0.0.0/8.5", "prefix"],
    ["0.0.0.0/0", "wider than /8"],
    ["::/0", "wider than /8"],
    ["0.0.0.0/1", "wider than /8"],
    ["10.0.0.0/7", "wider than /8"],
    ["::/1", "wider than /8"],
    ["::/8", "IPv4-mapped"],
    ["::ffff:0:0/80", "IPv4-mapped"],
    ["::ffff:0:0/96", "wider than /8"],
    ["::ffff:8000:0/97", "wider than /8"],
  ])("rejects %j", (entry, fragment) => {
    const result = parseTrustedProxy(entry);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain(fragment);
    }
  });
});

describe("createTrustedProxies", () => {
  it("matches addresses inside a CIDR range and exact addresses", () => {
    const trusted = trust("10.0.0.0/8", "192.168.1.7", "fd00::/8");

    expect(trusted.has("10.200.3.4")).toBe(true);
    expect(trusted.has("11.0.0.1")).toBe(false);
    expect(trusted.has("192.168.1.7")).toBe(true);
    expect(trusted.has("192.168.1.8")).toBe(false);
    expect(trusted.has("fd12::1")).toBe(true);
    expect(trusted.has("fe80::1")).toBe(false);
  });

  it("matches an IPv4-mapped IPv6 peer against an IPv4 rule", () => {
    expect(trust("127.0.0.1").has("::ffff:127.0.0.1")).toBe(true);
  });

  it("matches a peer that carries a zone id", () => {
    expect(trust("fe80::1").has("fe80::1%eth0")).toBe(true);
  });

  it("trusts nothing that is missing or not an address", () => {
    const trusted = trust("10.0.0.0/8");

    expect(trusted.has(undefined)).toBe(false);
    expect(trusted.has("")).toBe(false);
    expect(trusted.has("garbage")).toBe(false);
  });

  it("trusts nothing when the list is empty", () => {
    expect(createTrustedProxies([]).has("127.0.0.1")).toBe(false);
    expect(NO_TRUSTED_PROXIES.has("127.0.0.1")).toBe(false);
  });
});

describe("clientAddress", () => {
  const proxies = trust("127.0.0.1", "10.0.0.0/8");

  it("ignores the header from a peer that is not a trusted proxy", () => {
    expect(clientAddress("203.0.113.9", "1.2.3.4", proxies)).toBe("203.0.113.9");
    expect(clientAddress("127.0.0.1", "1.2.3.4", NO_TRUSTED_PROXIES)).toBe("127.0.0.1");
  });

  it("uses the peer when a trusted proxy sends no header", () => {
    expect(clientAddress("127.0.0.1", undefined, proxies)).toBe("127.0.0.1");
    expect(clientAddress("127.0.0.1", "", proxies)).toBe("127.0.0.1");
    expect(clientAddress("127.0.0.1", " , ", proxies)).toBe("127.0.0.1");
  });

  it("takes the single hop a trusted proxy appended", () => {
    expect(clientAddress("127.0.0.1", "1.2.3.4", proxies)).toBe("1.2.3.4");
    expect(clientAddress("::ffff:127.0.0.1", "1.2.3.4", proxies)).toBe("1.2.3.4");
  });

  it("ignores entries a client prepended", () => {
    expect(clientAddress("127.0.0.1", "6.6.6.6, 1.2.3.4", proxies)).toBe("1.2.3.4");
  });

  it("skips trusted proxies in a chain", () => {
    expect(clientAddress("127.0.0.1", "6.6.6.6, 1.2.3.4, 10.0.0.5", proxies)).toBe("1.2.3.4");
  });

  it("falls back to the peer when every hop is trusted", () => {
    expect(clientAddress("127.0.0.1", "10.0.0.5, 10.0.0.6", proxies)).toBe("127.0.0.1");
  });

  it.each([
    "1.2.3.4, garbage",
    "1.2.3.4:80",
    "[2001:db8::1]:443",
    "unknown",
    "1.2.3.4,,",
  ])("falls back to the peer when the nearest untrusted hop is malformed (%j)", (header) => {
    expect(clientAddress("127.0.0.1", header, proxies)).toBe("127.0.0.1");
  });

  it.each([
    "::ffff:1.2.3.4",
    "::ffff:102:304",
    "0:0:0:0:0:FFFF:0102:0304",
  ])("reads an IPv4-mapped hop however it is written (%j)", (hop) => {
    expect(clientAddress("127.0.0.1", hop, proxies)).toBe("1.2.3.4");
  });

  it("handles IPv6 hops and extra whitespace", () => {
    expect(clientAddress("127.0.0.1", "  2001:db8::1  ,\t10.0.0.5 ", proxies)).toBe("2001:db8::1");
  });

  it("reads repeated headers as one list", () => {
    expect(clientAddress("127.0.0.1", ["6.6.6.6", "1.2.3.4, 10.0.0.5"], proxies)).toBe("1.2.3.4");
  });

  it("returns an undefined peer unchanged", () => {
    expect(clientAddress(undefined, "1.2.3.4", proxies)).toBeUndefined();
  });
});

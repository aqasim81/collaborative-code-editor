import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function PrismaClient() {
    return { id: Symbol("client") };
  }),
}));

const globalForPrisma = globalThis as unknown as { prisma?: unknown };

describe("prisma singleton", () => {
  beforeEach(() => {
    globalForPrisma.prisma = undefined;
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalForPrisma.prisma = undefined;
  });

  it("reuses one client across module reloads outside production", async () => {
    const first = (await import("@/lib/prisma")).prisma;
    vi.resetModules();
    const second = (await import("@/lib/prisma")).prisma;

    expect(second).toBe(first);
    expect(globalForPrisma.prisma).toBe(first);
  });

  it("does not cache the client globally in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { prisma } = await import("@/lib/prisma");

    expect(prisma).toBeDefined();
    expect(globalForPrisma.prisma).toBeUndefined();
  });
});

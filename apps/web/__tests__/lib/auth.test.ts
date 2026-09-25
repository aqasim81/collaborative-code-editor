import { describe, expect, it, vi } from "vitest";

const { nextAuthMock, adapterMock, prismaMock } = vi.hoisted(() => ({
  nextAuthMock: vi.fn(() => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })),
  adapterMock: vi.fn(() => ({ name: "prisma-adapter" })),
  prismaMock: { name: "prisma-client" },
}));

vi.mock("next-auth", () => ({ default: nextAuthMock }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: adapterMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

describe("auth", () => {
  it("combines the edge config with the Prisma adapter", async () => {
    const auth = await import("@/lib/auth");
    const { authConfig } = await import("@/lib/auth.config");

    expect(adapterMock).toHaveBeenCalledWith(prismaMock);
    expect(nextAuthMock).toHaveBeenCalledWith({
      ...authConfig,
      adapter: { name: "prisma-adapter" },
    });
    expect(auth).toHaveProperty("handlers");
    expect(auth).toHaveProperty("signIn");
    expect(auth).toHaveProperty("signOut");
  });
});

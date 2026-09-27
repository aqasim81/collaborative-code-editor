import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findRoomByInviteToken: vi.fn(),
  findMemberRole: vi.fn(),
  joinRoomAction: vi.fn(),
  // Next's helpers throw to stop rendering; mirror that so the page stops too.
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock("@/lib/rooms", () => ({
  findRoomByInviteToken: mocks.findRoomByInviteToken,
  findMemberRole: mocks.findMemberRole,
}));
vi.mock("@/actions/invite", () => ({ joinRoomAction: mocks.joinRoomAction }));

import JoinPage from "@/app/join/[token]/page";

const token = "Ab0-_".repeat(8).concat("xyz");
const page = (value = token) => JoinPage({ params: Promise.resolve({ token: value }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "u2", name: "Bob" } });
  mocks.findRoomByInviteToken.mockResolvedValue({
    id: "r1",
    name: "Pairing",
    creator: { name: "Ada" },
  });
  mocks.findMemberRole.mockResolvedValue(null);
});

describe("invite page", () => {
  it("sends a signed-out visitor to sign-in and back, without looking the token up", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(page()).rejects.toThrow(`NEXT_REDIRECT /sign-in?callbackUrl=%2Fjoin%2F${token}`);
    expect(mocks.findRoomByInviteToken).not.toHaveBeenCalled();
  });

  it("404s a malformed token without a database lookup", async () => {
    await expect(page("not-a-token")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.findRoomByInviteToken).not.toHaveBeenCalled();
  });

  it("404s an unknown or reset token", async () => {
    mocks.findRoomByInviteToken.mockResolvedValue(null);

    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.findRoomByInviteToken).toHaveBeenCalledWith(token);
  });

  it("sends an existing member straight to the room", async () => {
    mocks.findMemberRole.mockResolvedValue("OWNER");

    await expect(page()).rejects.toThrow("NEXT_REDIRECT /room/r1");
    expect(mocks.findMemberRole).toHaveBeenCalledWith("r1", "u2");
  });

  it("asks a non-member to confirm, and writes nothing while rendering", async () => {
    const { container } = render(await page());

    expect(screen.getByRole("heading", { name: "Join Pairing" })).toBeInTheDocument();
    expect(screen.getByText(/Ada invited you/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join room" })).toBeInTheDocument();
    expect(container.querySelector('input[name="token"]')).toHaveValue(token);
    expect(mocks.joinRoomAction).not.toHaveBeenCalled();
  });

  it("names nobody when the owner has no name", async () => {
    mocks.findRoomByInviteToken.mockResolvedValue({ id: "r1", name: "P", creator: { name: null } });

    render(await page());
    expect(screen.getByText(/Someone invited you/)).toBeInTheDocument();
  });
});

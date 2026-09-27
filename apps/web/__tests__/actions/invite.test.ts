import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findRoomByInviteToken: vi.fn(),
  addEditorMember: vi.fn(),
  rotateInviteToken: vi.fn(),
  revalidatePath: vi.fn(),
  findMemberRole: vi.fn(),
  // Next's helpers throw to stop the action; mirror that.
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock("@/lib/rooms", () => ({
  findRoomByInviteToken: mocks.findRoomByInviteToken,
  addEditorMember: mocks.addEditorMember,
  rotateInviteToken: mocks.rotateInviteToken,
  findMemberRole: mocks.findMemberRole,
}));

import { acceptInvite, joinRoomAction, resetInviteLink } from "@/actions/invite";

const token = "A".repeat(43);
const session = { user: { id: "u2", name: "Bob", image: null }, expires: "2099-01-01" };
const room = { id: "r1", name: "Pairing", creator: { name: "Ada" } };

function form(value?: string): FormData {
  const data = new FormData();
  if (value !== undefined) {
    data.set("token", value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(session);
  mocks.findRoomByInviteToken.mockResolvedValue(room);
  mocks.addEditorMember.mockResolvedValue(undefined);
});

describe("acceptInvite (Invariant 2)", () => {
  it("makes the signed-in user an EDITOR of the token's room", async () => {
    await expect(acceptInvite(token)).resolves.toEqual({ success: true, data: { roomId: "r1" } });
    expect(mocks.findRoomByInviteToken).toHaveBeenCalledWith(token);
    expect(mocks.addEditorMember).toHaveBeenCalledWith("r1", "u2");
  });

  it.each([
    undefined,
    42,
    "short",
    `${"A".repeat(42)}=`,
  ])("refuses the malformed token %p without a session or database lookup", async (value) => {
    await expect(acceptInvite(value)).resolves.toEqual({
      success: false,
      error: "Invite not found",
    });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.findRoomByInviteToken).not.toHaveBeenCalled();
  });

  it("refuses a signed-out visitor", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(acceptInvite(token)).resolves.toEqual({ success: false, error: "Not signed in" });
    expect(mocks.findRoomByInviteToken).not.toHaveBeenCalled();
  });

  it("gives an unknown or reset token the same answer as a malformed one", async () => {
    mocks.findRoomByInviteToken.mockResolvedValue(null);

    await expect(acceptInvite(token)).resolves.toEqual({
      success: false,
      error: "Invite not found",
    });
    expect(mocks.addEditorMember).not.toHaveBeenCalled();
  });

  it("reports a database failure without details", async () => {
    mocks.addEditorMember.mockRejectedValue(new Error("connection refused"));

    await expect(acceptInvite(token)).resolves.toEqual({
      success: false,
      error: "Could not join the room. Try again.",
    });
  });
});

describe("joinRoomAction", () => {
  it("joins and redirects to the room", async () => {
    await expect(joinRoomAction(form(token))).rejects.toThrow("NEXT_REDIRECT /room/r1");
    expect(mocks.addEditorMember).toHaveBeenCalledWith("r1", "u2");
  });

  it("404s when the token is gone or missing", async () => {
    mocks.findRoomByInviteToken.mockResolvedValue(null);

    await expect(joinRoomAction(form(token))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(joinRoomAction(form())).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("resetInviteLink", () => {
  const newToken = "N".repeat(43);

  it("gives the owner a new link on the site's origin", async () => {
    mocks.rotateInviteToken.mockResolvedValue(newToken);

    await expect(resetInviteLink("r1")).resolves.toEqual({
      success: true,
      data: { inviteUrl: `http://localhost:3000/join/${newToken}` },
    });
    expect(mocks.rotateInviteToken).toHaveBeenCalledWith("r1", "u2");
    // The room page's cached props would otherwise still carry the revoked link.
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/room/r1");
  });

  it("tells an editor only the owner can reset it", async () => {
    mocks.rotateInviteToken.mockResolvedValue(null);
    mocks.findMemberRole.mockResolvedValue("EDITOR");

    await expect(resetInviteLink("r1")).resolves.toEqual({
      success: false,
      error: "Only the room's owner can reset the invite link",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("answers a non-member as if the room were missing", async () => {
    mocks.rotateInviteToken.mockResolvedValue(null);
    mocks.findMemberRole.mockResolvedValue(null);

    await expect(resetInviteLink("r1")).resolves.toEqual({
      success: false,
      error: "Room not found",
    });
  });

  it("rejects an invalid room id before any lookup", async () => {
    await expect(resetInviteLink("")).resolves.toEqual({
      success: false,
      error: "Invalid room id",
    });
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("refuses a signed-out visitor", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(resetInviteLink("r1")).resolves.toEqual({
      success: false,
      error: "Not signed in",
    });
    expect(mocks.rotateInviteToken).not.toHaveBeenCalled();
  });

  it("reports a database failure without details", async () => {
    mocks.rotateInviteToken.mockRejectedValue(new Error("connection refused"));

    await expect(resetInviteLink("r1")).resolves.toEqual({
      success: false,
      error: "Could not reset the invite link. Try again.",
    });
  });
});

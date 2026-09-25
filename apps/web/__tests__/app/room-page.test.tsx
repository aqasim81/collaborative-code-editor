import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findRoomForMember, notFound, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  findRoomForMember: vi.fn(),
  // Next's helpers throw to stop rendering; mirror that so the page stops too.
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/rooms", () => ({ findRoomForMember }));
vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("@/components/editor/room-editor", () => ({
  RoomEditor: ({ roomName, initialLanguage }: { roomName: string; initialLanguage: string }) => (
    <div data-testid="room-editor">{`${roomName}:${initialLanguage}`}</div>
  ),
}));

import RoomPage from "@/app/room/[id]/page";

const params = Promise.resolve({ id: "r1" });

describe("room page (Invariant 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to sign-in when there is no session", async () => {
    auth.mockResolvedValueOnce(null);

    await expect(RoomPage({ params })).rejects.toThrow(
      "NEXT_REDIRECT /sign-in?callbackUrl=%2Froom%2Fr1",
    );
    expect(findRoomForMember).not.toHaveBeenCalled();
  });

  it("returns 404 when the user is not a member", async () => {
    auth.mockResolvedValueOnce({ user: { id: "u2", name: "Eve" } });
    findRoomForMember.mockResolvedValueOnce(null);

    await expect(RoomPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(findRoomForMember).toHaveBeenCalledWith("r1", "u2");
  });

  it("renders the editor for a member with the room's language", async () => {
    auth.mockResolvedValueOnce({ user: { id: "u1", name: "Ada" } });
    findRoomForMember.mockResolvedValueOnce({ id: "r1", name: "Pairing", language: "cobol" });

    render(await RoomPage({ params }));

    expect(screen.getByTestId("room-editor")).toHaveTextContent("Pairing:javascript");
    expect(notFound).not.toHaveBeenCalled();
  });
});

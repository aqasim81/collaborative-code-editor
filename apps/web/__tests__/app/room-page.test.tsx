import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomEditor } from "@/components/editor/room-editor";
import { findServerValues } from "../helpers/client-props";

type RoomEditorProps = ComponentProps<typeof RoomEditor>;

const { auth, findRoomForMember, notFound, redirect, roomEditorProps } = vi.hoisted(() => ({
  auth: vi.fn(),
  // Records the props the Server Component hands across the client boundary.
  roomEditorProps: vi.fn(),
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
  RoomEditor: (props: RoomEditorProps) => {
    roomEditorProps(props);
    return (
      <div data-testid="room-editor">
        {`${props.roomId}:${props.roomName}:${props.initialLanguage}:${props.serverUrl}:${JSON.stringify(props.user)}`}
      </div>
    );
  },
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
    auth.mockResolvedValueOnce({ user: { id: "u1", name: "Ada", image: "https://a.test/u1" } });
    findRoomForMember.mockResolvedValueOnce({ id: "r1", name: "Pairing", language: "cobol" });

    render(await RoomPage({ params }));

    // Only the session's public fields reach the client component.
    expect(screen.getByTestId("room-editor")).toHaveTextContent(
      'r1:Pairing:javascript:ws://localhost:8080:{"id":"u1","name":"Ada","image":"https://a.test/u1"}',
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it("passes the client editor only public values (Invariant 6)", async () => {
    auth.mockResolvedValueOnce({
      user: { id: "u1", name: "Ada", image: null, email: "ada@example.test" },
    });
    findRoomForMember.mockResolvedValueOnce({ id: "r1", name: "Pairing", language: "python" });

    render(await RoomPage({ params }));

    // Exact match: an extra prop, or an extra session field such as email, fails the test.
    expect(roomEditorProps).toHaveBeenCalledWith({
      roomId: "r1",
      roomName: "Pairing",
      initialLanguage: "python",
      serverUrl: "ws://localhost:8080",
      user: { id: "u1", name: "Ada", image: null },
    });
    expect(findServerValues(roomEditorProps.mock.calls[0]?.[0])).toEqual([]);
  });
});

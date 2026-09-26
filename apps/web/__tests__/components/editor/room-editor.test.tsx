import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { room } = vi.hoisted(() => ({
  room: {
    value: {
      text: "shared-text",
      awareness: "presence",
      status: "connected",
      error: null as string | null,
    },
  },
}));

vi.mock("@/components/editor/code-editor", () => ({
  CodeEditor: ({
    language,
    text,
    awareness,
  }: {
    language: string;
    text: string;
    awareness: string;
  }) => <div data-testid="editor">{`${language}:${text}:${awareness}`}</div>,
}));
vi.mock("@/components/room/presence-list", () => ({
  PresenceList: ({ awareness }: { awareness: string }) => (
    <div data-testid="presence">{awareness}</div>
  ),
}));
vi.mock("@/components/room/room-provider", () => ({
  RoomProvider: ({
    roomId,
    user,
    serverUrl,
    children,
  }: {
    roomId: string;
    user: { id: string };
    serverUrl: string;
    children: ReactNode;
  }) => (
    <div data-testid="provider" data-room={roomId} data-user={user.id} data-url={serverUrl}>
      {children}
    </div>
  ),
  useRoom: () => room.value,
}));

import { RoomEditor } from "@/components/editor/room-editor";

function renderEditor() {
  render(
    <RoomEditor
      roomId="r1"
      roomName="Pairing"
      initialLanguage="go"
      user={{ id: "u1", name: "Ada", image: null }}
      serverUrl="ws://ws.test"
    />,
  );
}

describe("RoomEditor", () => {
  beforeEach(() => {
    room.value = { text: "shared-text", awareness: "presence", status: "connected", error: null };
  });

  it("connects to the room and binds the editor to its shared text", () => {
    renderEditor();

    expect(screen.getByTestId("provider")).toHaveAttribute("data-room", "r1");
    expect(screen.getByTestId("provider")).toHaveAttribute("data-url", "ws://ws.test");
    expect(screen.getByTestId("provider")).toHaveAttribute("data-user", "u1");
    expect(screen.getByTestId("editor")).toHaveTextContent("go:shared-text:presence");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the room's presence and connection status", () => {
    renderEditor();

    expect(screen.getByTestId("presence")).toHaveTextContent("presence");
    expect(screen.getByRole("status")).toHaveTextContent("Connected");
  });

  it("starts on the room's language and passes selections to the editor", () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "json" } });

    expect(screen.getByTestId("editor")).toHaveTextContent("json:shared-text:presence");
    expect(screen.getByLabelText("Language")).toHaveValue("json");
  });

  it("shows why the room could not be joined", () => {
    room.value = {
      text: "shared-text",
      awareness: "presence",
      status: "connecting",
      error: "Room not found",
    };
    renderEditor();

    expect(screen.getByRole("alert")).toHaveTextContent("Could not join this room: Room not found");
    expect(screen.getByRole("status")).toHaveTextContent("Disconnected");
  });
});

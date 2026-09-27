import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { room } = vi.hoisted(() => ({
  room: {
    value: {
      text: "shared-text",
      awareness: "presence",
      status: "connected",
      error: null as string | null,
      reloadHint: false,
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
vi.mock("@/components/room/share-room-button", () => ({
  ShareRoomButton: ({ roomId, initialInviteUrl }: { roomId: string; initialInviteUrl: string }) => (
    <button type="button">{`Share ${roomId} ${initialInviteUrl}`}</button>
  ),
}));

import { RoomEditor } from "@/components/editor/room-editor";

function renderEditor(inviteUrl: string | null = null) {
  render(
    <RoomEditor
      roomId="r1"
      roomName="Pairing"
      initialLanguage="go"
      user={{ id: "u1", name: "Ada", image: null }}
      serverUrl="ws://ws.test"
      inviteUrl={inviteUrl}
    />,
  );
}

describe("RoomEditor", () => {
  beforeEach(() => {
    room.value = {
      text: "shared-text",
      awareness: "presence",
      status: "connected",
      error: null,
      reloadHint: false,
    };
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
    room.value = { ...room.value, status: "connecting", error: "Room not found" };
    renderEditor();

    expect(screen.getByRole("alert")).toHaveTextContent("Could not join this room: Room not found");
    expect(screen.getByRole("status")).toHaveTextContent("Disconnected");
  });

  it("suggests a reload while ticket fetches keep failing (#43)", () => {
    room.value = { ...room.value, status: "disconnected", reloadHint: true };
    renderEditor();

    expect(
      screen
        .getAllByRole("status")
        .some((el) =>
          el.textContent?.startsWith("Having trouble reconnecting. Reloading the page may help."),
        ),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows only the refusal when a reload hint and an error coincide (#43)", () => {
    room.value = {
      ...room.value,
      status: "disconnected",
      error: "Room not found",
      reloadHint: true,
    };
    renderEditor();

    expect(screen.getByRole("alert")).toHaveTextContent("Could not join this room: Room not found");
    expect(screen.queryByText(/Having trouble reconnecting/)).not.toBeInTheDocument();
  });

  it("reloads the page only when the user asks (#43)", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    room.value = { ...room.value, status: "disconnected", reloadHint: true };
    renderEditor();
    expect(reload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(reload).toHaveBeenCalledOnce();
  });

  it("shows Share only when it has an invite link (the owner's page)", () => {
    renderEditor("https://site.test/join/tok");

    expect(
      screen.getByRole("button", { name: "Share r1 https://site.test/join/tok" }),
    ).toBeInTheDocument();
  });

  it("shows no Share button without an invite link", () => {
    renderEditor(null);

    expect(screen.queryByRole("button", { name: /^Share/ })).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

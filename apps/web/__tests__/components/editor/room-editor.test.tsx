import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { room } = vi.hoisted(() => ({
  room: { value: { text: "shared-text", error: null as string | null } },
}));

vi.mock("@/components/editor/code-editor", () => ({
  CodeEditor: ({ language, text }: { language: string; text: string }) => (
    <div data-testid="editor">{`${language}:${text}`}</div>
  ),
}));
vi.mock("@/components/room/room-provider", () => ({
  RoomProvider: ({
    roomId,
    serverUrl,
    children,
  }: {
    roomId: string;
    serverUrl: string;
    children: ReactNode;
  }) => (
    <div data-testid="provider" data-room={roomId} data-url={serverUrl}>
      {children}
    </div>
  ),
  useRoom: () => room.value,
}));

import { RoomEditor } from "@/components/editor/room-editor";

function renderEditor() {
  render(
    <RoomEditor roomId="r1" roomName="Pairing" initialLanguage="go" serverUrl="ws://ws.test" />,
  );
}

describe("RoomEditor", () => {
  beforeEach(() => {
    room.value = { text: "shared-text", error: null };
  });

  it("connects to the room and binds the editor to its shared text", () => {
    renderEditor();

    expect(screen.getByTestId("provider")).toHaveAttribute("data-room", "r1");
    expect(screen.getByTestId("provider")).toHaveAttribute("data-url", "ws://ws.test");
    expect(screen.getByTestId("editor")).toHaveTextContent("go:shared-text");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("starts on the room's language and passes selections to the editor", () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "json" } });

    expect(screen.getByTestId("editor")).toHaveTextContent("json:shared-text");
    expect(screen.getByLabelText("Language")).toHaveValue("json");
  });

  it("shows why the room could not be joined", () => {
    room.value = { text: "shared-text", error: "Room not found" };
    renderEditor();

    expect(screen.getByRole("alert")).toHaveTextContent("Could not join this room: Room not found");
  });
});

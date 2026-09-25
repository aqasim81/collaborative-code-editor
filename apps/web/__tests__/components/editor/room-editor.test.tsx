import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/editor/code-editor", () => ({
  CodeEditor: ({ language }: { language: string }) => <div data-testid="editor">{language}</div>,
}));

import { RoomEditor } from "@/components/editor/room-editor";

describe("RoomEditor", () => {
  it("starts on the room's language and passes selections to the editor", () => {
    render(<RoomEditor roomName="Pairing" initialLanguage="go" />);

    expect(screen.getByTestId("editor")).toHaveTextContent("go");

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "json" } });

    expect(screen.getByTestId("editor")).toHaveTextContent("json");
    expect(screen.getByLabelText("Language")).toHaveValue("json");
  });
});

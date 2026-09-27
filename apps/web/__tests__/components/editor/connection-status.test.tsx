import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConnectionStatus } from "@/components/editor/connection-status";

describe("ConnectionStatus", () => {
  it.each([
    ["connected", "Connected", "bg-green-500"],
    ["connecting", "Connecting…", "bg-yellow-400"],
    ["reconnecting", "Reconnecting…", "bg-yellow-400"],
    ["disconnected", "Disconnected", "bg-red-500"],
  ] as const)("shows %s as %s", (status, label, colour) => {
    render(<ConnectionStatus status={status} error={null} />);

    expect(screen.getByRole("status")).toHaveTextContent(label);
    expect(screen.getByTestId("status-dot")).toHaveClass(colour);
  });

  it("shows red when the room can't be joined, whatever the socket says", () => {
    render(<ConnectionStatus status="connecting" error="not_found" />);

    expect(screen.getByRole("status")).toHaveTextContent("Disconnected");
    expect(screen.getByTestId("status-dot")).toHaveClass("bg-red-500");
  });

  it("shows only the dot on phones but keeps the word for screen readers", () => {
    render(<ConnectionStatus status="connected" error={null} />);

    expect(screen.getByText("Connected")).toHaveClass("sr-only", "sm:not-sr-only");
  });
});

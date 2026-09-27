import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RoomSummary } from "@/lib/rooms";

vi.mock("@/actions/room", () => ({ deleteRoom: vi.fn() }));

import { RoomCard } from "@/components/room/room-card";

const room: RoomSummary = {
  id: "r1",
  name: "Pairing",
  language: "python",
  role: "OWNER",
  createdAt: new Date("2026-03-04T12:00:00Z"),
  updatedAt: new Date("2026-03-05T12:00:00Z"),
};

describe("RoomCard", () => {
  it("links to the room and shows its language, created date and role", () => {
    render(<RoomCard room={room} />);

    expect(screen.getByRole("link", { name: "Pairing" })).toHaveAttribute("href", "/room/r1");
    expect(screen.getByText("Python")).toBeInTheDocument();
    const created = screen.getByText("Mar 4, 2026");
    expect(created.tagName).toBe("TIME");
    expect(created).toHaveAttribute("dateTime", "2026-03-04T12:00:00.000Z");
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("offers Delete to the owner", () => {
    render(<RoomCard room={room} />);

    expect(screen.getByRole("button", { name: "Delete Pairing" })).toBeInTheDocument();
  });

  it("hides Delete from an editor", () => {
    render(<RoomCard room={{ ...room, role: "EDITOR" }} />);

    expect(screen.getByText("Editor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });
});

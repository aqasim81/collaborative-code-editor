import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeleteRoomButton } from "@/components/room/delete-room-button";
import type { RoomSummary } from "@/lib/rooms";
import { findServerValues } from "../helpers/client-props";

const { auth, listRooms, redirect, clientProps } = vi.hoisted(() => ({
  auth: vi.fn(),
  listRooms: vi.fn(),
  // Records the props the Server Components hand across the client boundary.
  clientProps: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/actions/room", () => ({ listRooms }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/room/create-room-dialog", () => ({
  CreateRoomDialog: (props: object) => {
    clientProps(props);
    return <button type="button">New room</button>;
  },
}));
vi.mock("@/components/room/delete-room-button", () => ({
  DeleteRoomButton: (props: ComponentProps<typeof DeleteRoomButton>) => {
    clientProps(props);
    return <button type="button">Delete {props.roomName}</button>;
  },
}));

import DashboardPage from "@/app/dashboard/page";

const session = { user: { id: "u1", name: "Ada", email: "ada@example.test" } };

function summary(id: string, name: string, role: RoomSummary["role"]): RoomSummary {
  const date = new Date("2026-03-04T12:00:00Z");
  return { id, name, language: "go", role, createdAt: date, updatedAt: date };
}

describe("dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(session);
  });

  it("redirects to sign-in when there is no session", async () => {
    auth.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow(
      "NEXT_REDIRECT /sign-in?callbackUrl=%2Fdashboard",
    );
    expect(listRooms).not.toHaveBeenCalled();
  });

  it("invites the user to create a first room", async () => {
    listRooms.mockResolvedValue({ success: true, data: [] });

    render(await DashboardPage());

    expect(screen.getByText("No rooms yet — create one to start editing together.")).toBeVisible();
    expect(screen.getByRole("button", { name: "New room" })).toBeInTheDocument();
  });

  it("lists rooms in the order the server returns them", async () => {
    listRooms.mockResolvedValue({
      success: true,
      data: [summary("r2", "Recent", "EDITOR"), summary("r1", "Older", "OWNER")],
    });

    render(await DashboardPage());

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => within(item).getByRole("link").textContent)).toEqual([
      "Recent",
      "Older",
    ]);
  });

  it("shows why the rooms could not be loaded", async () => {
    listRooms.mockResolvedValue({ success: false, error: "Could not load your rooms. Try again." });

    render(await DashboardPage());

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your rooms. Try again.");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("passes the client components only public values (Invariant 6)", async () => {
    listRooms.mockResolvedValue({ success: true, data: [summary("r1", "Older", "OWNER")] });

    render(await DashboardPage());

    expect(clientProps).toHaveBeenCalledTimes(2);
    for (const [props] of clientProps.mock.calls) {
      expect(findServerValues(props, [["email", "ada@example.test"]])).toEqual([]);
    }
  });
});

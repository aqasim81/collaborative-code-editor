import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteRoom, toast } = vi.hoisted(() => ({
  deleteRoom: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/actions/room", () => ({ deleteRoom }));
vi.mock("sonner", () => ({ toast }));

import { DeleteRoomButton } from "@/components/room/delete-room-button";

function openConfirm() {
  render(<DeleteRoomButton roomId="r1" roomName="Pairing" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete Pairing" }));
}

function confirmDelete() {
  openConfirm();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
}

describe("DeleteRoomButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for confirmation before deleting", () => {
    openConfirm();

    expect(screen.getByRole("alertdialog", { name: "Delete Pairing?" })).toBeInTheDocument();
    expect(screen.getByText("This removes the room for every member.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteRoom).not.toHaveBeenCalled();
  });

  it("deletes the room and confirms it", async () => {
    deleteRoom.mockResolvedValue({ success: true, data: { id: "r1" } });

    confirmDelete();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Room deleted"));
    expect(deleteRoom).toHaveBeenCalledWith("r1");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows the server's refusal", async () => {
    deleteRoom.mockResolvedValue({ success: false, error: "Only the room's owner can delete it" });

    confirmDelete();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Only the room's owner can delete it"),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resetInviteLink, toast } = vi.hoisted(() => ({
  resetInviteLink: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/actions/invite", () => ({ resetInviteLink }));
vi.mock("sonner", () => ({ toast }));

import { ShareRoomButton } from "@/components/room/share-room-button";

const url = "https://site.test/join/old";
const writeText = vi.fn();

function openShare() {
  render(<ShareRoomButton roomId="r1" initialInviteUrl={url} />);
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

describe("ShareRoomButton", () => {
  it("copies the invite link on Share and shows it in the dialog", async () => {
    openShare();

    expect(writeText).toHaveBeenCalledWith(url);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Invite link copied"));
    expect(screen.getByRole("dialog", { name: "Share this room" })).toBeInTheDocument();
    expect(screen.getByLabelText("Invite link")).toHaveValue(url);
  });

  it("points to the visible link when the clipboard is refused", async () => {
    writeText.mockRejectedValue(new Error("NotAllowedError"));
    openShare();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't copy — select the link and copy it"),
    );
    expect(screen.getByLabelText("Invite link")).toHaveValue(url);
  });

  it("copies again from the dialog", async () => {
    openShare();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it("asks before resetting and does nothing on cancel", () => {
    openShare();
    fireEvent.click(screen.getByRole("button", { name: "Reset link" }));

    expect(screen.getByRole("alertdialog", { name: "Reset the invite link?" })).toBeInTheDocument();
    expect(
      screen.getByText("The old link stops working. People who already joined keep access."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(resetInviteLink).not.toHaveBeenCalled();
  });

  it("shows the new link after a reset", async () => {
    resetInviteLink.mockResolvedValue({
      success: true,
      data: { inviteUrl: "https://site.test/join/new" },
    });
    openShare();
    fireEvent.click(screen.getByRole("button", { name: "Reset link" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("New invite link created"));
    expect(resetInviteLink).toHaveBeenCalledWith("r1");
    expect(screen.getByLabelText("Invite link")).toHaveValue("https://site.test/join/new");
  });

  it("keeps the old link and reports a failed reset", async () => {
    resetInviteLink.mockResolvedValue({
      success: false,
      error: "Only the room's owner can reset the invite link",
    });
    openShare();
    fireEvent.click(screen.getByRole("button", { name: "Reset link" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Only the room's owner can reset the invite link"),
    );
    expect(screen.getByLabelText("Invite link")).toHaveValue(url);
  });
});

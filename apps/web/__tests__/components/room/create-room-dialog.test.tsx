import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createRoom, push } = vi.hoisted(() => ({ createRoom: vi.fn(), push: vi.fn() }));

vi.mock("@/actions/room", () => ({ createRoom }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { CreateRoomDialog } from "@/components/room/create-room-dialog";

function openDialog() {
  render(<CreateRoomDialog />);
  fireEvent.click(screen.getByRole("button", { name: "New room" }));
}

function submit(name: string, language?: string) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  if (language) {
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: language } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Create room" }));
}

describe("CreateRoomDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a form with the name capped and the default language selected", () => {
    openDialog();

    expect(screen.getByRole("dialog", { name: "New room" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("maxLength", "80");
    expect(screen.getByLabelText("Language")).toHaveValue("javascript");
  });

  it("creates the room and goes to it", async () => {
    createRoom.mockResolvedValue({ success: true, data: { id: "r9" } });
    openDialog();

    submit("  Pairing ", "python");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/room/r9"));
    expect(createRoom).toHaveBeenCalledWith({ name: "Pairing", language: "python" });
  });

  it.each([
    ["", "Enter a room name"],
    ["   ", "Enter a room name"],
    ["x".repeat(81), "Room names are at most 80 characters"],
  ])("refuses the name %j without calling the server", (name, message) => {
    openDialog();

    submit(name);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(createRoom).not.toHaveBeenCalled();
  });

  it("shows the server's error and stays open", async () => {
    createRoom.mockResolvedValue({ success: false, error: "Not signed in" });
    openDialog();

    submit("Pairing");

    expect(await screen.findByText("Not signed in")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("disables submit while the room is being created", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    createRoom.mockReturnValue(new Promise((done) => (resolve = done)));
    openDialog();

    submit("Pairing");

    expect(await screen.findByRole("button", { name: "Creating…" })).toBeDisabled();
    resolve({ success: true, data: { id: "r9" } });
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it("clears an old error when reopened", () => {
    openDialog();
    submit("");
    expect(screen.getByText("Enter a room name")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "New room" }));

    expect(screen.queryByText("Enter a room name")).not.toBeInTheDocument();
  });
});

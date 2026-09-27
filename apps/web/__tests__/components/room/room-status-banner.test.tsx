import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomContextValue } from "@/components/room/room-provider";
import type { RoomJoinErrorCode } from "@/lib/room-errors";

type RoomState = Pick<RoomContextValue, "status" | "error" | "reloadHint" | "retry">;

const { room } = vi.hoisted(() => ({ room: { value: {} as RoomState } }));

vi.mock("@/components/room/room-provider", () => ({ useRoom: () => room.value }));

import { RoomStatusBanner } from "@/components/room/room-status-banner";

const retry = vi.fn();

function renderBanner(state: Partial<RoomState>) {
  room.value = { status: "connected", error: null, reloadHint: false, retry, ...state };
  return render(<RoomStatusBanner roomId="r1" />);
}

describe("RoomStatusBanner", () => {
  beforeEach(() => {
    retry.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["not_found", "You can't join this room", "Back to your rooms", "/dashboard"],
    ["invalid_room", "This room link isn't valid", "Back to your rooms", "/dashboard"],
    ["deleted", "This room was deleted", "Back to your rooms", "/dashboard"],
    ["unauthenticated", "You've been signed out", "Sign in", "/sign-in?callbackUrl=%2Froom%2Fr1"],
  ] as const)("explains %s and links the way forward", (code, title, link, href) => {
    renderBanner({ status: "disconnected", error: code as RoomJoinErrorCode });

    expect(screen.getByRole("alert")).toHaveTextContent(title);
    expect(screen.getByRole("link", { name: link })).toHaveAttribute("href", href);
    expect(screen.queryByRole("button", { name: "Retry now" })).not.toBeInTheDocument();
  });

  it("never says whether a refused room exists (Invariant 2)", () => {
    renderBanner({ error: "not_found" });

    expect(screen.getByRole("alert")).toHaveTextContent(/doesn't exist or you don't have access/);
  });

  it("explains an unreachable server and retries on request", () => {
    renderBanner({ status: "disconnected" });

    expect(screen.getByRole("alert")).toHaveTextContent("Can't reach the collaboration server");
    expect(screen.getByRole("alert")).toHaveTextContent("Your edits stay in this tab");
    fireEvent.click(screen.getByRole("button", { name: "Retry now" }));

    expect(retry).toHaveBeenCalledOnce();
  });

  it("suggests a reload instead while ticket fetches keep failing (#43)", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    renderBanner({ status: "disconnected", reloadHint: true });

    expect(screen.getByRole("status")).toHaveTextContent("Having trouble reconnecting");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it.each([
    "connected",
    "connecting",
    "reconnecting",
  ] as const)("shows nothing while %s", (status) => {
    const { container } = renderBanner({ status });

    expect(container).toBeEmptyDOMElement();
  });
});

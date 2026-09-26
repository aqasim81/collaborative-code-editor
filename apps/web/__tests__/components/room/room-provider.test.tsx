import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import type { ConnectRoomOptions } from "@/lib/yjs/provider";

const { connectRoom, getRoomTicket, calls } = vi.hoisted(() => {
  const calls: Array<{ options: ConnectRoomOptions; destroy: ReturnType<typeof vi.fn> }> = [];
  return {
    calls,
    getRoomTicket: vi.fn(),
    connectRoom: vi.fn(),
  };
});

vi.mock("@/actions/room-ticket", () => ({ getRoomTicket }));
vi.mock("@/lib/yjs/provider", () => ({ connectRoom }));

import { RoomProvider, useRoom } from "@/components/room/room-provider";

function Probe() {
  const { text, status, error } = useRoom();
  return <div data-testid="probe">{`${text.toString()}|${status}|${error ?? ""}`}</div>;
}

function lastCall() {
  const call = calls.at(-1);
  if (!call) {
    throw new Error("connectRoom was not called");
  }
  return call;
}

describe("RoomProvider", () => {
  beforeEach(() => {
    calls.length = 0;
    connectRoom.mockImplementation((options: ConnectRoomOptions) => {
      const doc = new Y.Doc();
      const text = doc.getText("codemirror");
      text.insert(0, "hello");
      const destroy = vi.fn();
      calls.push({ options, destroy });
      return { doc, text, provider: {}, destroy };
    });
  });

  it("connects to the room with the server action as ticket source", () => {
    render(
      <RoomProvider roomId="r1" serverUrl="ws://ws.test">
        <Probe />
      </RoomProvider>,
    );

    expect(screen.getByTestId("probe")).toHaveTextContent("hello|connecting|");
    const { options } = lastCall();
    expect(options.roomId).toBe("r1");
    expect(options.serverUrl).toBe("ws://ws.test");
    expect(options.fetchTicket).toBe(getRoomTicket);
  });

  it("reflects connection status and errors, clearing the error once connected", () => {
    render(
      <RoomProvider roomId="r1" serverUrl="ws://ws.test">
        <Probe />
      </RoomProvider>,
    );
    const { options } = lastCall();

    act(() => options.onError?.("Room not found"));
    expect(screen.getByTestId("probe")).toHaveTextContent("hello|connecting|Room not found");

    act(() => options.onStatus?.("connected"));
    expect(screen.getByTestId("probe")).toHaveTextContent("hello|connected|");

    act(() => options.onStatus?.("disconnected"));
    expect(screen.getByTestId("probe")).toHaveTextContent("hello|disconnected|");
  });

  it("destroys the connection on unmount", () => {
    const { unmount } = render(
      <RoomProvider roomId="r1" serverUrl="ws://ws.test">
        <Probe />
      </RoomProvider>,
    );
    const { destroy } = lastCall();

    unmount();

    expect(destroy).toHaveBeenCalledOnce();
  });

  it("refuses to be used outside a provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow("useRoom must be used inside <RoomProvider>");
    vi.restoreAllMocks();
  });
});

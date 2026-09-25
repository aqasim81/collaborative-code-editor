import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { main } from "../src/main";
import { closed, openClient, waitFor } from "./helpers/sockets";
import { signTicket, TEST_SECRET } from "./helpers/tickets";

class FakeProcess extends EventEmitter {
  exit = vi.fn();
}

const validEnv = { WS_TICKET_SECRET: TEST_SECRET, WS_SERVER_PORT: "0", LOG_LEVEL: "silent" };

describe("main", () => {
  it("refuses to start with an invalid environment", async () => {
    const result = await main({ WS_SERVER_PORT: "0" }, new FakeProcess());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("WS_TICKET_SECRET");
    }
  });

  it.each(["SIGTERM", "SIGINT"] as const)("shuts down gracefully on %s", async (signal) => {
    const proc = new FakeProcess();
    const result = await main(validEnv, proc);
    if (!result.success) {
      throw new Error(result.error);
    }
    const server = result.data;
    const ws = await openClient(
      `ws://127.0.0.1:${server.port}/room-1?ticket=${await signTicket()}`,
    );
    await waitFor(() => server.stats().connections === 1);
    const done = closed(ws);

    proc.emit(signal);
    proc.emit(signal); // a second signal must not start a second shutdown

    expect((await done).code).toBe(1001);
    await waitFor(() => proc.exit.mock.calls.length > 0);
    expect(proc.exit).toHaveBeenCalledTimes(1);
    expect(proc.exit).toHaveBeenCalledWith(0);
  });

  it("reports a port that cannot be bound", async () => {
    const first = await main(validEnv, new FakeProcess());
    if (!first.success) {
      throw new Error(first.error);
    }
    const second = await main(
      { ...validEnv, WS_SERVER_PORT: String(first.data.port) },
      new FakeProcess(),
    );

    expect(second.success).toBe(false);
    await first.data.close();
  });
});

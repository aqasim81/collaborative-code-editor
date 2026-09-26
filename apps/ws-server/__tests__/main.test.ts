import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/main";
import { closed, openClient, waitFor } from "./helpers/sockets";
import { tempDir } from "./helpers/stores";
import { signTicket, TEST_SECRET } from "./helpers/tickets";

class FakeProcess extends EventEmitter {
  exit = vi.fn();
}

let dir: ReturnType<typeof tempDir>;
let validEnv: Record<string, string>;

describe("main", () => {
  beforeEach(() => {
    dir = tempDir();
    validEnv = {
      WS_TICKET_SECRET: TEST_SECRET,
      WS_SERVER_PORT: "0",
      LOG_LEVEL: "silent",
      WS_PERSISTENCE_DIR: dir.path,
    };
  });
  afterEach(() => {
    dir.remove();
  });

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
    const other = tempDir();
    const second = await main(
      { ...validEnv, WS_SERVER_PORT: String(first.data.port), WS_PERSISTENCE_DIR: other.path },
      new FakeProcess(),
    );

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toContain("could not listen");
    }
    await first.data.close();
    other.remove();
  });

  it("refuses to start when the document store is locked by another process", async () => {
    const first = await main(validEnv, new FakeProcess());
    if (!first.success) {
      throw new Error(first.error);
    }

    const second = await main(validEnv, new FakeProcess());

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toContain("could not open");
    }
    await first.data.close();
  });
});

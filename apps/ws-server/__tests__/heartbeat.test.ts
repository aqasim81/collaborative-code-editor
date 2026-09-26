import { roomTicketProtocols } from "@collab-editor/shared";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { type RunningServer, startServer } from "../src/server";
import { silentLogger } from "./helpers/logger";
import { closed, waitFor } from "./helpers/sockets";
import { createMemoryStore } from "./helpers/stores";
import { signTicket, TEST_SECRET } from "./helpers/tickets";

const servers: RunningServer[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) {
    await server.close();
  }
});

async function start(): Promise<RunningServer> {
  const result = await startServer({
    port: 0,
    host: "127.0.0.1",
    ticketSecret: TEST_SECRET,
    roomGracePeriodMs: 30_000,
    logger: silentLogger,
    store: createMemoryStore(),
    heartbeatIntervalMs: 50,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  servers.push(result.data);
  return result.data;
}

/** A client whose socket may stop answering pings, like one on a dropped network. */
async function open(server: RunningServer, autoPong: boolean): Promise<WebSocket> {
  const ws = new WebSocket(
    `ws://127.0.0.1:${server.port}/room-1`,
    roomTicketProtocols(await signTicket()),
    { autoPong },
  );
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  return ws;
}

describe("heartbeat (#33)", () => {
  it("terminates a connection that stops answering pings", async () => {
    const server = await start();
    const dead = await open(server, false);
    const gone = closed(dead);

    await waitFor(() => server.stats().connections === 0);
    // Terminated, not closed politely: a dead peer would never answer a close frame.
    expect((await gone).code).toBe(1006);
  });

  it("keeps a connection that answers pings", async () => {
    const server = await start();
    const live = await open(server, true);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(live.readyState).toBe(WebSocket.OPEN);
    expect(server.stats().connections).toBe(1);
    live.close();
  });
});

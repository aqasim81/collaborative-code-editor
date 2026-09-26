import type { ServerMessage } from "@collab-editor/shared";
import { WebSocket } from "ws";

/** Resolves with the HTTP status when the server refuses the upgrade; rejects if it opens. */
export function expectUpgradeRejected(url: string, protocols: string[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, protocols);
    ws.on("unexpected-response", (req, res) => {
      req.destroy();
      resolve(res.statusCode ?? 0);
    });
    ws.on("open", () => {
      ws.terminate();
      reject(new Error("connection was accepted"));
    });
    ws.on("error", () => undefined);
  });
}

/** Opens a socket offering `protocols` (e.g. `roomTicketProtocols(ticket)`). */
export function openClient(url: string, protocols: string[] = []): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, protocols);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

/** The next JSON text message; binary Yjs sync frames are skipped. */
export function nextMessage(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    const onMessage = (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        return;
      }
      ws.off("message", onMessage);
      resolve(JSON.parse(String(data)) as ServerMessage);
    };
    ws.on("message", onMessage);
  });
}

export function closed(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) {
      resolve({ code: 1006, reason: "" });
      return;
    }
    ws.once("close", (code, reason) => resolve({ code, reason: reason.toString() }));
  });
}

/** Polls until the condition holds; server-side bookkeeping lags the client by a tick. */
export async function waitFor(condition: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error("condition not met in time");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Sends a frame the server rejects (unknown message type) so it closes the socket, and stops reading so
 * the close frame is never answered. The caller terminates `ws` when done.
 */
export function provokeUnansweredClose(ws: WebSocket): void {
  ws.send(Uint8Array.of(99));
  ws.pause();
}

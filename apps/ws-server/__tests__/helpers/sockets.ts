import type { ServerMessage } from "@collab-editor/shared";
import { WebSocket } from "ws";

/** Resolves with the HTTP status when the server refuses the upgrade; rejects if it opens. */
export function expectUpgradeRejected(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
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

export function openClient(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

export function nextMessage(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    ws.once("message", (data) => resolve(JSON.parse(String(data)) as ServerMessage));
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

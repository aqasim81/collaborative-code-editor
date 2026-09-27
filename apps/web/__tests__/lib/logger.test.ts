// @vitest-environment node
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { captureLogs } from "../helpers/logger";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("logger (#51)", () => {
  it("is a pino logger named web at the LOG_LEVEL from env", async () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    const { logger } = await import("@/lib/logger");

    expect(logger.level).toBe("warn");
    expect(logger.bindings()).toMatchObject({ name: "web" });
  });
});

describe("createWebLogger (#54, #55, #57)", () => {
  it("redacts tickets, tokens, authorization headers and the ticket subprotocol in either case, and keeps other fields", async () => {
    const { createWebLogger } = await import("@/lib/logger");
    const { stream, lines } = captureLogs();
    const logger = createWebLogger("info", stream);

    logger.info({ roomId: "room-1", ticket: "t.secret" }, "a");
    logger.info({ headers: { authorization: "Bearer secret", host: "h" } }, "b");
    logger.info(
      { req: { headers: { "sec-websocket-protocol": "collab.v1, ticket.secret" } } },
      "c",
    );
    logger.info({ purge: { ticket: "t.secret", authorization: "Bearer secret" } }, "d");
    logger.info(
      {
        token: "t.secret",
        request: { headers: { Authorization: "Bearer secret", "Sec-WebSocket-Protocol": "x" } },
      },
      "e",
    );

    const [a, b, c, d, e] = lines();
    expect(a).toMatchObject({ name: "web", roomId: "room-1", ticket: "[Redacted]" });
    expect(b).toMatchObject({ headers: { authorization: "[Redacted]", host: "h" } });
    expect(c).toMatchObject({ req: { headers: { "sec-websocket-protocol": "[Redacted]" } } });
    expect(d).toMatchObject({ purge: { ticket: "[Redacted]", authorization: "[Redacted]" } });
    expect(e).toMatchObject({
      token: "[Redacted]",
      request: {
        headers: { Authorization: "[Redacted]", "Sec-WebSocket-Protocol": "[Redacted]" },
      },
    });
    expect(JSON.stringify(lines())).not.toContain("secret");
  });
  it("redacts cookie and set-cookie headers in either case", async () => {
    const { createWebLogger } = await import("@/lib/logger");
    const { stream, lines } = captureLogs();
    const logger = createWebLogger("info", stream);

    logger.info(
      { cookie: "session=secret", headers: { Cookie: "session=secret", host: "h" } },
      "a",
    );
    logger.info({ req: { headers: { cookie: "session=secret" } } }, "b");
    logger.info(
      {
        headers: { "set-cookie": ["session=secret"] },
        reply: { headers: { "Set-Cookie": ["session=secret"], "set-cookie": ["session=secret"] } },
      },
      "c",
    );

    const [a, b, c] = lines();
    expect(a).toMatchObject({ cookie: "[Redacted]", headers: { Cookie: "[Redacted]", host: "h" } });
    expect(b).toMatchObject({ req: { headers: { cookie: "[Redacted]" } } });
    expect(c).toMatchObject({
      headers: { "set-cookie": "[Redacted]" },
      reply: { headers: { "Set-Cookie": "[Redacted]", "set-cookie": "[Redacted]" } },
    });
    expect(JSON.stringify(lines())).not.toContain("secret");
  });

  it("logs a Node request as req without rawHeaders and with its secret headers redacted", async () => {
    const { createWebLogger } = await import("@/lib/logger");
    const { stream, lines } = captureLogs();
    const logger = createWebLogger("info", stream);
    const req = new IncomingMessage(new Socket());
    req.method = "GET";
    req.url = "/rooms/room-1";
    req.headers = {
      host: "h",
      "sec-websocket-protocol": "collab.v1, ticket.secret",
      authorization: "Bearer secret",
      cookie: "session=secret",
    };
    req.rawHeaders = Object.entries(req.headers).flatMap(([name, value]) => [name, String(value)]);

    logger.info({ req }, "upgrade");
    logger.info({ request: req }, "other key");

    const [line, other] = lines();
    expect(line).toMatchObject({
      req: {
        method: "GET",
        url: "/rooms/room-1",
        headers: {
          host: "h",
          "sec-websocket-protocol": "[Redacted]",
          authorization: "[Redacted]",
          cookie: "[Redacted]",
        },
      },
    });
    expect(line?.req).not.toHaveProperty("rawHeaders");
    expect(other).toMatchObject({ request: { rawHeaders: "[Redacted]" } });
    expect(JSON.stringify(lines())).not.toContain("secret");
  });

  it("logs a Node response as res without its request and with set-cookie redacted", async () => {
    const { createWebLogger } = await import("@/lib/logger");
    const { stream, lines } = captureLogs();
    const logger = createWebLogger("info", stream);
    const req = new IncomingMessage(new Socket());
    req.headers = { cookie: "session=secret" };
    const res = new ServerResponse(req);
    res.setHeader("set-cookie", ["session=secret"]);
    res.setHeader("content-type", "text/plain");

    logger.info({ res }, "response");

    const [line] = lines();
    expect(line).toMatchObject({
      res: {
        statusCode: null,
        headers: { "set-cookie": "[Redacted]", "content-type": "text/plain" },
      },
    });
    expect(line?.res).not.toHaveProperty("req");
    expect(JSON.stringify(lines())).not.toContain("secret");
  });

  it("redacts cookies and Auth.js session cookie names at the top level and one level down", async () => {
    const { createWebLogger } = await import("@/lib/logger");
    const { stream, lines } = captureLogs();
    const logger = createWebLogger("info", stream);

    logger.info(
      {
        cookies: { session: "secret" },
        "authjs.session-token": "secret",
        "__Secure-authjs.session-token": "secret",
        jar: {
          cookies: ["session=secret"],
          "authjs.session-token": "secret",
          "__Secure-authjs.session-token": "secret",
          host: "h",
        },
      },
      "a",
    );

    const [a] = lines();
    expect(a).toMatchObject({
      cookies: "[Redacted]",
      "authjs.session-token": "[Redacted]",
      "__Secure-authjs.session-token": "[Redacted]",
      jar: {
        cookies: "[Redacted]",
        "authjs.session-token": "[Redacted]",
        "__Secure-authjs.session-token": "[Redacted]",
        host: "h",
      },
    });
    expect(JSON.stringify(lines())).not.toContain("secret");
  });

  it("redacts invite tokens and links at the top level and one level down (#36)", async () => {
    const { createWebLogger } = await import("@/lib/logger");
    const { stream, lines } = captureLogs();
    const logger = createWebLogger("info", stream);

    logger.info(
      { inviteToken: "secret", inviteUrl: "https://s.test/join/secret", roomId: "r1" },
      "a",
    );
    logger.info({ room: { id: "r1", inviteToken: "secret", inviteUrl: "secret" } }, "b");

    const [a, b] = lines();
    expect(a).toMatchObject({ inviteToken: "[Redacted]", inviteUrl: "[Redacted]", roomId: "r1" });
    expect(b).toMatchObject({
      room: { id: "r1", inviteToken: "[Redacted]", inviteUrl: "[Redacted]" },
    });
    expect(JSON.stringify(lines())).not.toContain("secret");
  });

  it("still logs an error's message and stack under err", async () => {
    const { createWebLogger } = await import("@/lib/logger");
    const { stream, lines } = captureLogs();
    const logger = createWebLogger("info", stream);

    logger.error({ err: new Error("boom") }, "failed");

    const [line] = lines();
    expect(line).toMatchObject({ err: { type: "Error", message: "boom" } });
    expect(line?.err).toHaveProperty("stack", expect.stringContaining("Error: boom"));
  });
});

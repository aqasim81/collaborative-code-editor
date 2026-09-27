import { describe, expect, it } from "vitest";
import { createLogger } from "../src/logger";
import { captureLogs } from "./helpers/logger";

describe("createLogger (#54)", () => {
  it("is a pino logger named ws-server at the given level", () => {
    const logger = createLogger("warn");

    expect(logger.level).toBe("warn");
    expect(logger.bindings()).toMatchObject({ name: "ws-server" });
  });

  it("redacts tickets, tokens, authorization headers and the ticket subprotocol in either case, and keeps other fields", () => {
    const { stream, lines } = captureLogs();
    const logger = createLogger("info", stream);

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
    expect(a).toMatchObject({ roomId: "room-1", ticket: "[Redacted]" });
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
});

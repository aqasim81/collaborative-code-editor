import { describe, expect, it } from "vitest";
import { parseClientMessage } from "../../src/handlers/messages";

const text = (value: string) => Buffer.from(value, "utf8");

describe("parseClientMessage (Invariant 1)", () => {
  it("accepts a ping", () => {
    expect(parseClientMessage(text('{"type":"ping"}'), false)).toEqual({
      success: true,
      data: { type: "ping" },
    });
  });

  it.each([
    ['{"type":"shutdown"}', "unknown or malformed message"],
    ['{"type":"ping","extra":1}', "unknown or malformed message"],
    ["[]", "unknown or malformed message"],
    ["not json", "message is not valid JSON"],
  ])("rejects %s", (raw, error) => {
    expect(parseClientMessage(text(raw), false)).toEqual({ success: false, error });
  });

  it("rejects binary frames until Yjs sync lands", () => {
    expect(parseClientMessage(Buffer.from([0, 1, 2]), true).success).toBe(false);
  });
});

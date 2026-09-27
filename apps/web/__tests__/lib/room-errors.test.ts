import { describe, expect, it } from "vitest";
import { ROOM_ERROR_COPY, SERVER_UNREACHABLE_COPY } from "@/lib/room-errors";

describe("room error copy", () => {
  it("gives every refusal a title, an explanation and a way forward", () => {
    expect(Object.keys(ROOM_ERROR_COPY).sort()).toEqual(
      ["deleted", "invalid_room", "not_found", "unauthenticated"].sort(),
    );
    for (const copy of Object.values(ROOM_ERROR_COPY)) {
      expect(copy.title).not.toBe("");
      expect(copy.body).not.toBe("");
      expect(["dashboard", "sign-in"]).toContain(copy.action);
    }
  });

  it("tells the user edits are kept while the server is unreachable", () => {
    expect(SERVER_UNREACHABLE_COPY.body).toMatch(/edits stay in this tab/);
  });
});

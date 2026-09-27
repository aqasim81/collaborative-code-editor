import { describe, expect, it } from "vitest";
import { createRoomSchema, ROOM_NAME_MAX_LENGTH, roomIdSchema } from "@/lib/room-input";

function firstError(input: unknown): string | undefined {
  const parsed = createRoomSchema.safeParse(input);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

describe("createRoomSchema", () => {
  it("accepts a trimmed name and a supported language", () => {
    expect(createRoomSchema.parse({ name: "  Pairing  ", language: "python" })).toEqual({
      name: "Pairing",
      language: "python",
    });
  });

  it("accepts a name of exactly the maximum length", () => {
    const name = "x".repeat(ROOM_NAME_MAX_LENGTH);
    expect(createRoomSchema.safeParse({ name, language: "go" }).success).toBe(true);
  });

  it.each([
    ["an empty name", "", "Enter a room name"],
    ["a blank name", "   ", "Enter a room name"],
    ["a missing name", undefined, "Enter a room name"],
    ["a non-string name", 42, "Enter a room name"],
    [
      "an overlong name",
      "x".repeat(ROOM_NAME_MAX_LENGTH + 1),
      "Room names are at most 80 characters",
    ],
  ])("refuses %s", (_label, name, message) => {
    expect(firstError({ name, language: "go" })).toBe(message);
  });

  it.each([
    ["an unknown language", "cobol"],
    ["a missing language", undefined],
    ["a non-string language", 1],
  ])("refuses %s", (_label, language) => {
    expect(firstError({ name: "Room", language })).toBe("Pick a supported language");
  });
});

describe("roomIdSchema", () => {
  it.each([
    ["", false],
    ["r1", true],
    ["x".repeat(64), true],
    ["x".repeat(65), false],
    [7, false],
  ])("%j valid: %s", (id, valid) => {
    expect(roomIdSchema.safeParse(id).success).toBe(valid);
  });
});

import { z } from "zod";
import { isLanguageId } from "@/lib/languages";

// Room input rules shared by the create-room form (client) and the room actions (server).

export const ROOM_NAME_MAX_LENGTH = 80;

const NAME_REQUIRED = "Enter a room name";
const LANGUAGE_UNSUPPORTED = "Pick a supported language";

const roomNameSchema = z
  .string({ required_error: NAME_REQUIRED, invalid_type_error: NAME_REQUIRED })
  .trim()
  .min(1, NAME_REQUIRED)
  .max(ROOM_NAME_MAX_LENGTH, `Room names are at most ${ROOM_NAME_MAX_LENGTH} characters`);

const languageSchema = z
  .string({ required_error: LANGUAGE_UNSUPPORTED, invalid_type_error: LANGUAGE_UNSUPPORTED })
  .refine(isLanguageId, LANGUAGE_UNSUPPORTED);

export const createRoomSchema = z.object(
  { name: roomNameSchema, language: languageSchema },
  { required_error: "Invalid room", invalid_type_error: "Invalid room" },
);

export const roomIdSchema = z.string().min(1).max(64);

export const INVALID_ROOM_ID = "Invalid room id";
// A missing room and a room the user can't access get the same answer (Invariant 2).
export const ROOM_NOT_FOUND = "Room not found";

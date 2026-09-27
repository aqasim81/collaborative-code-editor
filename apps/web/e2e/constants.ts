// Shared by global setup and the spec.
import { join } from "node:path";

/** Where global setup writes the signed-in browser state, whatever directory the check runs from. Gitignored. */
export const STORAGE_STATE = join(__dirname, ".auth", "user.json");

/** The room `db:seed` creates; its owner is the user the check signs in as. */
export const SEED_ROOM_ID = "seed-room";

/** `E2E_SIGNED_OUT_ONLY=1` checks the public pages only: no database, secret or WS server needed. */
export const SIGNED_OUT_ONLY = process.env.E2E_SIGNED_OUT_ONLY === "1";

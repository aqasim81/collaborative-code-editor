# 0002. Implement the Yjs sync server on y-protocols, persisting before broadcasting

- **Status:** Accepted
- **Date:** 2026-09-26

## Context

Phase 5 (#8) connects the editor to the WS server through Yjs. The implementation plan assumed
`y-websocket`'s bundled server utilities (`y-websocket/bin/utils`). Those utilities:

- broadcast an update to the room as soon as it is applied and write it to LevelDB in the background, so a
  crash can lose an update other clients already have (Invariant 4);
- decode frames while applying them, with no way to validate a frame first (Invariant 1);
- keep documents in a module-global map configured through environment variables, outside our room manager
  and its grace-period lifecycle.

## Decision

The WS server speaks the y-websocket wire protocol itself, using `yjs`, `y-protocols/awareness` and `lib0`:

- `src/sync/protocol.ts` decodes and validates a whole binary frame (sync step 1/2, update, awareness,
  query awareness) before anything is applied; anything else closes the socket with 1003.
- `src/sync/sync-room.ts` keeps one `Y.Doc` and `Awareness` per room. A per-room promise chain appends each
  document update to the store and only then broadcasts it; sync step 2 replies are encoded when requested
  and sent after the writes queued before them. A failed load or write closes the room's sockets with 1011
  and evicts the room so the next join reloads from storage.
- `src/persistence/document-store.ts` wraps `y-leveldb` (`WS_PERSISTENCE_DIR`, default `.leveldb`) and
  returns open errors (e.g. a held lock) instead of crashing.
- Awareness is relayed and tracked per connection in memory only, and cleared when the connection closes.
- Clients keep using `y-websocket`'s `WebsocketProvider`, with the room ticket in its subprotocols (it
  was in the URL params until #19) and BroadcastChannel disabled so every edit goes through the server.

## Consequences

- Invariants 1, 4 and 5 are enforced in code we test directly (`__tests__/sync`, `__tests__/collaboration.test.ts`).
- A write sits on the path of every broadcast; LevelDB appends are fast, but a slow disk delays delivery.
- We own protocol compatibility with `y-websocket`; the integration tests run the real provider against
  the server to catch drift.
- `leveldown` 5 has no prebuilt binary for macOS arm64 and compiles on install
  (`pnpm --filter @collab-editor/ws-server rebuild leveldown` if it was skipped).

## Alternatives considered

- **`y-websocket/bin/utils`** — rejected for the reasons in Context.
- **Hocuspocus** — a full server framework with its own auth and persistence hooks; replaces rather than
  fits the room manager and ticket auth from #7, and adds a larger dependency for the same protocol.

## Addendum (2026-09-26, #9, #32): the server owns presence identity

Phase 6 shows names, avatars and colours from awareness. y-protocols relays whatever state a client sends,
so a member could appear as someone else, clear another member's presence or register any number of
presences. Decision:

- Before applying an awareness update, the server replaces `user` in every non-null state with the
  presence user built from the connection's ticket (`sub`, `name`, `image`; colour from
  `userColor(sub)` in `@collab-editor/shared`) and re-encodes the accepted entries. Tickets carry the
  avatar as an https URL or null; clients load it directly (not through the image optimiser), so each
  viewer's browser fetches another member's avatar host, which is GitHub's for every account today.
- A `cursor` must be null or a pair of root-text relative positions, checked with Zod when the frame is
  parsed: a malformed one would crash the cursor plugins of everyone who receives it.
- A connection speaks for one client id, the first it announces. Each id stays bound to the user who
  first held it for as long as the WS server runs, even across an empty room's teardown (up to 100 ids per user; past that the user's own oldest unused ids are forgotten, never anyone else's), so no other user can take it over, even between its owner's disconnect and
  reconnect.
- A connection whose first presence uses an id another user holds is closed with `4002` (`PRESENCE_ID_TAKEN_CLOSE_CODE`);
  the client moves to a new random client id and reconnects. This covers collisions and an id squatted
  while the server's memory was empty (after a restart). Bindings not announced for an hour are dropped whenever a room is created (the per-user cap bounds a
  room that stays open).
- Other entries that break these rules are dropped rather than closing the connection: honest y-websocket
  clients send some of them (echoes, and removals after their own 30 s timeout). Removals count only for
  a presence that exists, so no metadata is kept for ids the room has never had.
- Another connection of the same user may take an id over: a client whose socket died comes back on a
  new one before the server notices the old one is gone. A ping heartbeat (#33) terminates such sockets.
- The connection that last set an id's state controls it and clears it when it closes or the server starts
  closing it (#28); any removal, including the server's 30 s timeout sweep, releases that control.
- Clients re-announce their presence with a newer clock on every connect, because the server and other
  clients keep the old clock after a disconnect and would ignore a same-clock resend.

Consequences: presence shown to others is always the ticket identity; the name a client sets for itself
is only visible to that client. Colours can repeat between users (16-colour palette) in exchange for being
stable across sessions.


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
- Clients keep using `y-websocket`'s `WebsocketProvider`, with the room ticket in its URL params and
  BroadcastChannel disabled so every edit goes through the server.

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

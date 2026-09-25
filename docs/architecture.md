> This is a living document. Update it as the architecture evolves during development.

# Architecture

## System Design Overview

The collaborative code editor is a three-component system:

1. **Web App** (Next.js 15) — Authentication, room management, editor UI
2. **WebSocket Server** (Node.js + ws) — Real-time document synchronization, room lifecycle
3. **Shared Types** (TypeScript package) — Type definitions shared between web and server

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  CodeMirror 6 │  │  Yjs Doc    │  │  Awareness    │  │
│  │  (Editor UI)  │←→│  (CRDT)     │←→│  (Cursors)    │  │
│  └──────────────┘  └──────┬──────┘  └───────┬───────┘  │
│                           │                  │           │
│                    ┌──────┴──────────────────┴──────┐   │
│                    │   y-websocket Provider          │   │
│                    └──────────────┬──────────────────┘   │
└───────────────────────────┬──────────────────────────────┘
                            │ WebSocket (wss://)
                            │
┌───────────────────────────┴──────────────────────────────┐
│                  WebSocket Server (Node.js)               │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐   │
│  │  ws Library   │  │  Room Mgr   │  │  Auth Verify  │   │
│  │  (Transport)  │←→│  (Lifecycle) │  │  (JWT Check)  │   │
│  └──────────────┘  └──────┬──────┘  └───────────────┘   │
│                           │                               │
│                    ┌──────┴──────┐                        │
│                    │  y-websocket │                        │
│                    │  (Yjs Sync)  │                        │
│                    └──────┬──────┘                        │
│                           │                               │
│                    ┌──────┴──────┐                        │
│                    │  LevelDB    │                        │
│                    │  (Doc Store) │                        │
│                    └─────────────┘                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                  Next.js Web App                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │  Pages    │  │  Auth.js │  │  Prisma + PostgreSQL   │ │
│  │  (UI)     │  │  (OAuth) │  │  (Users, Rooms, Meta)  │ │
│  └──────────┘  └──────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

1. User authenticates via GitHub OAuth → Auth.js creates session + JWT
2. User creates/joins room → Next.js Server Action creates room record in PostgreSQL
3. User enters editor → Browser connects to WS server with JWT + room ID
4. WS server verifies JWT → Joins user to room, syncs Yjs document from LevelDB
5. User types → CodeMirror → Yjs doc update → WS broadcast to room
6. Remote updates arrive → WS → Yjs merge → CodeMirror re-renders
7. Cursor moves → Awareness protocol → WS broadcast → Remote cursor overlay
8. User disconnects → WS server removes from room, notifies others via awareness

## Key Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| CRDT | Yjs | Industry standard, efficient, proven at Notion/Figma scale |
| Editor | CodeMirror 6 | Lightweight, first-class Yjs bindings, extensible |
| WebSocket | ws (Node.js) | Fastest WS library, full control over connection lifecycle |
| Auth | Auth.js v5 (JWT) | JWT strategy allows WS server to verify without DB access |
| Database | PostgreSQL + Prisma | Type-safe ORM, mature ecosystem |
| Doc persistence | LevelDB | Efficient binary storage for Yjs updates, built-in y-leveldb support |
| Monorepo | Turborepo | Fast builds, task caching, well-supported |

## Infrastructure Requirements by Phase

| Phase | Service | Type | Provisioning | Status |
|-------|---------|------|-------------|--------|
| Phase 1 | None | — | — | Ready |
| Phase 2 | PostgreSQL 16 | Local (Docker Compose) | `docker compose up -d` (host port 5434); hosted DB for deploy | Local ready |
| Phase 2 | GitHub OAuth App | External | Manual setup in GitHub Settings | Owner action |
| Phase 3 | None | — | — | Ready |
| Phase 4 | WebSocket Server (ws) | Self-contained | Runs locally / deploy to cloud | Ready |
| Phase 4 | LevelDB (y-leveldb) | Embedded | File-based, bundled with npm package | Ready |
| Phase 5 | Yjs Sync (y-websocket) | Self-contained | Bundled within WS server | Ready |
| Phase 6 | None | — | — | Ready |
| Phase 7 | None | — | — | Ready |

**Owner setup for sign-in:**
- **GitHub OAuth App** — Create at GitHub Settings → Developer Settings → OAuth Apps, callback `http://localhost:3000/api/auth/callback/github`
- **Hosted PostgreSQL** — Needed only for deployment (Neon, Supabase, etc.); local development uses Docker Compose

## Data Model

Postgres holds identity and room metadata; document content lives in LevelDB on the WS server.

| Model | Purpose |
|-------|---------|
| `User`, `Account`, `Session` | Auth.js Prisma adapter models (`Session` unused under JWT sessions) |
| `Room` | Room metadata: name, language, creator |
| `RoomMember` | Membership (`OWNER` / `EDITOR`), keyed by `(roomId, userId)`; grants room access (Invariant 2) |

## Authentication

- `apps/web/lib/auth.config.ts` — edge-safe Auth.js config (GitHub provider, JWT callbacks, `authorized` route check); used by `middleware.ts`
- `apps/web/lib/auth.ts` — adds the Prisma adapter; exports `auth`, `signIn`, `signOut`, `handlers`
- `middleware.ts` redirects signed-out requests for `/dashboard/*` and `/room/*` to `/sign-in?callbackUrl=…`; the sign-in action only follows same-origin callbacks
- The session JWT carries `id`, `name` and `picture`; it is a JWE encrypted with `AUTH_SECRET` (see ADR 0001)
- `apps/web/lib/env.ts` validates environment variables with Zod when `next.config.ts` loads

## Component Boundaries

- **Web app** owns: authentication, room CRUD, UI rendering, editor component
- **WS server** owns: real-time sync, document persistence, room lifecycle, presence
- **Shared package** owns: TypeScript type definitions used by both
- The web app and WS server communicate only via WebSocket (no direct DB sharing for document content)

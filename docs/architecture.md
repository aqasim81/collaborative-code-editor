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

## Component Boundaries

- **Web app** owns: authentication, room CRUD, UI rendering, editor component
- **WS server** owns: real-time sync, document persistence, room lifecycle, presence
- **Shared package** owns: TypeScript type definitions used by both
- The web app and WS server communicate only via WebSocket (no direct DB sharing for document content)

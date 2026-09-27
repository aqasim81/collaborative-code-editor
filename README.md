# Collaborative Code Editor

Real-time collaborative code editor where several people edit one document with live cursors. Yjs CRDTs, CodeMirror 6, a custom WebSocket sync server, Next.js 15.

[![CI](https://github.com/aqasim81/collaborative-code-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/aqasim81/collaborative-code-editor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Two windows editing the same room with live cursors](docs/media/demo.gif)

## Quickstart

You need Node 22 (`.nvmrc`), Docker and a [GitHub OAuth app](#github-oauth-app). pnpm comes from corepack.

```bash
nvm use && corepack enable && pnpm install --frozen-lockfile
docker compose up -d                     # Postgres 16 on localhost:5434
cp .env.example apps/web/.env            # then fill it in, see Setup below
pnpm --filter @collab-editor/web db:migrate
pnpm dev                                 # web on http://localhost:3000, WS server on :8080
```

Sign in with GitHub, create a room on the dashboard, and open it in a second window (or share its invite link
with someone signed in as another GitHub user) to see the edits and cursors sync.

## What it does

- **Real-time editing.** Every keystroke is a Yjs update; concurrent edits merge without conflicts, and edits made
  while offline resync when the connection comes back.
- **Live cursors and presence.** Remote carets and selections in each user's colour with a name label, a presence
  list of who is in the room, and a Connecting / Connected / Reconnecting / Disconnected indicator.
- **Rooms and roles.** A dashboard to create, list and delete rooms; the creator is the owner, invited users are
  editors. Deleting a room disconnects everyone in it and purges its document.
- **Secret invite links.** The owner copies a `/join/<token>` link and can reset it; the room id alone grants
  nothing.
- **Syntax highlighting for 10 languages** (JavaScript, TypeScript, Python, Go, Rust, Java, C, CSS, HTML, JSON),
  with grammars loaded on demand.
- **Durable documents.** The sync server writes every update to LevelDB before it broadcasts it; a restart restores
  every room.
- **GitHub sign-in** through Auth.js, with readable error states for sign-in failures, refused room joins and an
  unreachable server.

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    CM[CodeMirror 6] <--> YD[Y.Doc + Awareness]
    YD <--> P[y-websocket provider]
  end
  subgraph Web["Next.js web app"]
    AU[Auth.js<br/>GitHub OAuth, JWT]
    SA[Server Actions<br/>rooms, invites]
    TI[Room ticket issuer]
    DB[(PostgreSQL<br/>Prisma)]
    AU --> SA
    SA --> DB
    TI --> DB
  end
  subgraph WS["WS server (Node ws)"]
    TC[Ticket check<br/>+ rate limits]
    RM[Room manager]
    SY[Sync rooms<br/>y-protocols]
    LV[(LevelDB)]
    TC --> RM --> SY --> LV
  end
  Browser -- "pages, actions" --> Web
  P -- "WebSocket, ticket in<br/>Sec-WebSocket-Protocol" --> TC
  Web -- "DELETE /rooms/:id<br/>(room purge)" --> WS
```

A user signs in with GitHub; Auth.js keeps the session in a JWT cookie and users and rooms in Postgres. Opening a
room calls the `getRoomTicket` server action, which checks membership and signs a short-lived room ticket. The browser
presents it when it opens the WebSocket; the server verifies it, loads the room's document from LevelDB and runs the
Yjs sync handshake. From then on each update is validated, appended to LevelDB and only then broadcast; presence
carries the identity from the ticket. The WS server never touches Postgres, and the web app never sees document
content. More in [docs/architecture.md](docs/architecture.md).

## Key decisions

- **Short-lived room tickets instead of sharing the session with the WS server**
  ([ADR 0001](docs/adr/0001-jwt-sessions-for-ws-auth.md)). The web app checks membership and signs a 5-minute HS256
  ticket, so the WS server needs no database and no session secret. Trade-off: removing a member takes effect within
  one ticket lifetime (up to 5 minutes), not instantly.
- **An own Yjs sync server on `y-protocols` instead of `y-websocket`'s bundled server**
  ([ADR 0002](docs/adr/0002-own-yjs-sync-server.md)). It validates each whole frame before applying it, persists
  before broadcasting (no acknowledged update is lost), and replaces presence identity with the ticket's. Trade-off:
  the wire protocol is ours to keep compatible, so a test runs the real y-websocket client against the server.
- **Secret, resettable invite links instead of room-id access**
  ([ADR 0003](docs/adr/0003-secret-invite-links.md)). A 256-bit token makes a signed-in visitor an editor; bad,
  unknown and reset tokens all get the same 404. Trade-off: anyone holding a live link can join until the owner resets
  it.

## Quality

`make verify` is the single gate used by the git hooks and CI: Biome lint and format, strict TypeScript
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) and Vitest with coverage thresholds of 80% on both apps.
Today it runs 688 tests (428 in the web app, 260 in the WS server) at about 98% line coverage. The WS server's suite
includes end-to-end collaboration tests with the real y-websocket provider, restarts against LevelDB, rate limits,
ticket expiry and malformed frames. CI runs Verify, then a production Build. Lefthook runs Biome and gitleaks before
each commit and `make verify` before each push, and a Playwright check (`e2e:prod`) loads the production build and
fails on any console error or warning, or a page that scrolls sideways.

The project keeps six invariants, each backed by tests: the WS server never trusts a client (every connection
presents a valid, unexpired ticket and every message is validated and rate-limited); room access is authorised per
room, and only creating a room or a valid invite link grants membership; Yjs is the only source of document truth;
no update the server has broadcast is lost; presence is ephemeral and never stored; and secrets stay out of the
browser and out of the logs (both loggers redact tickets, authorization headers and cookies).

## Setup

### GitHub OAuth app

Create one at GitHub → Settings → Developer settings → OAuth Apps → New OAuth App:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

Copy the client ID and generate a client secret.

### Environment

Both apps read one file, `apps/web/.env` (the WS server's dev script loads it too). Start from `.env.example`:

| Variable | Used by | Value |
|----------|---------|-------|
| `DATABASE_URL` | web | `postgresql://collab:collab@localhost:5434/collab_editor` for the Docker Compose database |
| `AUTH_SECRET` | web | 32+ characters: `openssl rand -hex 32` |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | web | From the OAuth app |
| `AUTH_URL` | web | The app's public URL. Optional with `pnpm dev`; `http://localhost:3000` for `pnpm start`, which otherwise refuses sessions as an untrusted host |
| `WS_TICKET_SECRET` | both | 32+ characters, a different `openssl rand -hex 32`; signs and verifies room tickets |
| `NEXT_PUBLIC_WS_URL` | web (browser) | `ws://localhost:8080` |
| `NEXT_PUBLIC_SITE_URL` | web | `http://localhost:3000` |
| `WS_SERVER_URL` | web | Optional; how the web app reaches the WS server for room purges. Default: `NEXT_PUBLIC_WS_URL` with `ws` → `http` |
| `WS_SERVER_PORT` | WS server | Default `8080` |
| `WS_PERSISTENCE_DIR` | WS server | LevelDB directory, default `.leveldb` |
| `ROOM_GRACE_PERIOD_MS` | WS server | How long an empty room stays in memory, default `30000` |
| `WS_TRUSTED_PROXIES` | WS server | Comma-separated proxy IPs/CIDRs whose `X-Forwarded-For` is trusted; empty trusts none |
| `LOG_LEVEL` | both | pino level, default `info` |

Only the two `NEXT_PUBLIC_*` values reach the browser; never put a secret in one.

### Sample room and native build

After the Quickstart, sign in once at `http://localhost:3000`; then
`pnpm --filter @collab-editor/web db:seed` creates a sample room owned by you at `/room/seed-room`.

On Apple Silicon, if the WS server fails to load `leveldown`, build it once:
`pnpm --filter @collab-editor/ws-server rebuild leveldown`.

### Checks

```bash
lefthook install     # once, installs the git hooks
make verify          # lint, type-check, tests with coverage; ends with VERIFY OK
```

`make doctor` lists the tools the hooks need (node, pnpm, jq, git, lefthook, gitleaks).

### Production build

```bash
pnpm build
pnpm --filter @collab-editor/web start
cd apps/ws-server && node --env-file=../web/.env dist/index.js
```

Set `AUTH_URL` first (see the table). With both running, `E2E_SIGNED_OUT_ONLY=1 pnpm --filter @collab-editor/web e2e:prod`
checks the public pages for console errors and horizontal overflow (install the browser once with
`pnpm --filter @collab-editor/web exec playwright install chromium`).

### Re-recording the demo

`apps/web/e2e/record-demo.ts` signs in two demo users without GitHub and records them editing one room. With the
production build running and the same `AUTH_SECRET` and `DATABASE_URL` in the shell (throwaway values work), and
`ffmpeg` and `gifski` installed (`brew install ffmpeg gifski`):

```bash
pnpm --filter @collab-editor/web exec tsx e2e/record-demo.ts /tmp/demo   # writes /tmp/demo/videos.txt: file, seconds to trim
mkdir -p /tmp/demo/frames
ffmpeg -ss <trim-a> -i <video-a> -ss <trim-b> -i <video-b> -filter_complex \
  "[0:v]pad=iw+4:ih:0:0:color=0x404040[a];[a][1:v]hstack=inputs=2:shortest=1,fps=12,scale=960:-1:flags=lanczos" \
  /tmp/demo/frames/%04d.png
gifski --fps 12 --width 960 --quality 80 -o docs/media/demo.gif /tmp/demo/frames/*.png
```

## Status and roadmap

All seven planned phases are done: workspace and CI, GitHub sign-in, the editor, the WS server, Yjs sync with
persistence, cursors and presence, and room management with invite links. It runs locally and is not deployed.

Not done yet:

- **Deployment.** No hosted instance; the WS server needs a host with a persistent disk for LevelDB.
- **Instant revocation.** A member removed from a room keeps access until their ticket expires (up to 5 minutes).
- **Phones.** The layout works down to tablet width; editing on a phone is not supported.
- **Offline storage in the browser.** Edits made offline survive a reconnect, not a closed tab.
- **Branch protection** on `main` with a required `verify` check.

## Licence

[MIT](LICENSE)

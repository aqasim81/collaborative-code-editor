# 0003. Share rooms with a secret invite link

- **Status:** Accepted
- **Date:** 2026-09-27

## Context

Membership (`RoomMember`) is what grants access to a room (Invariant 2): the room page, `getRoomTicket` and every
room action check it, and the room id alone grants nothing. Until #36 the only way to become a member was to
create the room, so nobody could collaborate. The owner decided on 2026-09-27 that rooms are shared with a secret
invite link that the room's owner can reset. The WS server stays out of it: it only ever sees tickets, which
`getRoomTicket` issues after the membership check (Invariant 1).

## Decision

- **Token.** Each room has `Room.inviteToken`: 32 random bytes from `node:crypto`, base64url without padding
  (43 characters, 256 bits), unique. `apps/web/lib/invite.ts` (server-only) generates and validates it
  (`inviteTokenSchema`). The link is `/join/<token>` (`invitePath` in `lib/routes.ts`), made absolute on
  `NEXT_PUBLIC_SITE_URL`. Existing rooms were backfilled by the migration with a token of the same format.
- **Storage.** Plaintext in a unique column, so the owner can copy the link again at any time.
- **Who sees it.** Only the OWNER's room page computes the link and hands it to the client (`inviteUrl` prop on
  `RoomEditor`); everyone else gets `null` and no Share button. The dashboard never selects the column.
- **Joining.** `/join/<token>` needs a session (middleware and the page both redirect to sign-in, with the invite
  path as `callbackUrl`, before the token is looked at). The page only renders a confirmation ("<owner> invited you
  to <room>") and never writes; the Join button POSTs to `joinRoomAction`, which makes the user an `EDITOR`
  (an upsert that never changes an existing membership) and redirects to the room. An existing member is sent
  straight to the room.
- **Bad tokens.** A malformed, unknown or reset token gets Next's plain 404, identical in every case, saying
  nothing about any room.
- **Reset.** The owner can reset the link (`resetInviteLink`): a new token replaces the old one in an
  ownership-scoped update, so the old link 404s at once. Existing members keep their membership.

## Consequences

- Invariant 2 now reads: the room id alone grants nothing; only a valid invite token (or creating the room)
  grants membership.
- The link is a bearer secret. Anyone who gets hold of it and has a GitHub account can join as an editor until the
  owner resets it. Resetting does not evict people who already joined; removing members needs its own feature.
- No expiry and no use limit. Guessing is infeasible at 256 bits, so `/join` has no rate limit.
- The token appears in `/join/...` request lines and in the sign-in `callbackUrl`, like any invite link. Next's
  default `Referrer-Policy: strict-origin-when-cross-origin` keeps the path out of cross-origin referrers.
- Joining takes one extra click, the price of keeping GET free of side effects.

## Alternatives considered

- **Signed JWT invites.** No state per room, so a single link can't be revoked without a denylist, and the URLs
  are long.
- **Hashed tokens.** Protect the token at rest, but the owner could no longer copy the link again: every Share
  would have to reset it.
- **A `RoomInvite` table** with expiry, use counts and several links per room. More than the decided scope; the
  column can move into such a table later without changing link URLs.
- **Joining on GET.** One click fewer, but link unfurlers, prefetchers and cross-site `<img>` requests would create
  memberships.
- **The room id plus a "public" flag.** Makes the id a credential, against Invariant 2.

import { PRESENCE_COLORS, presenceUser, userColor } from "@collab-editor/shared";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import * as Y from "yjs";
import { readPresence, setLocalUser, usePresence } from "@/lib/yjs/awareness";

const ADA = { id: "u-ada", name: "Ada", image: "https://avatars.githubusercontent.com/u/1" };
const BOB = { id: "u-bob", name: "Bob", image: null };
const CY = { id: "u-cy", name: "Cy", image: null };

const created: Awareness[] = [];
function awareness(): Awareness {
  const a = new Awareness(new Y.Doc());
  created.push(a);
  return a;
}

/** Another client's presence arriving over the network, as the WS server relays it. */
function join(local: Awareness, user: typeof ADA | typeof BOB): Awareness {
  const remote = awareness();
  setLocalUser(remote, user);
  applyAwarenessUpdate(local, encodeAwarenessUpdate(remote, [remote.clientID]), "remote");
  return remote;
}

function leave(local: Awareness, remote: Awareness): void {
  remote.setLocalState(null);
  applyAwarenessUpdate(local, encodeAwarenessUpdate(remote, [remote.clientID]), "remote");
}

afterEach(() => {
  for (const a of created.splice(0)) {
    a.destroy();
  }
});

describe("userColor", () => {
  it("is the same for a user every time, and one of the palette colours", () => {
    expect(userColor("u-ada")).toEqual(userColor("u-ada"));
    expect(PRESENCE_COLORS).toContain(userColor("u-ada").color);
    expect(userColor("u-ada").colorLight).toBe(`${userColor("u-ada").color}33`);
  });

  it("spreads users across the palette", () => {
    const colors = new Set(Array.from({ length: 200 }, (_, i) => userColor(`user-${i}`).color));
    expect(colors.size).toBe(PRESENCE_COLORS.length);
  });
});

describe("presence", () => {
  it("announces the local user with colours the editor can use", () => {
    const local = awareness();
    setLocalUser(local, ADA);

    expect(local.getLocalState()?.user).toEqual(presenceUser(ADA));
  });

  it("lists this user first, then the others by name, once per user", () => {
    const local = awareness();
    setLocalUser(local, CY);
    join(local, BOB);
    join(local, ADA);
    join(local, ADA); // a second tab

    expect(readPresence(local, CY.id).map((e) => [e.user.name, e.isSelf])).toEqual([
      ["Cy", true],
      ["Ada", false],
      ["Bob", false],
    ]);
  });

  it("knows who this user is from the session, not from the local state (#32)", () => {
    const local = awareness();
    setLocalUser(local, ADA);
    join(local, BOB);
    // A state relayed for this client's own id can overwrite the local one; it must not change "you".
    local.setLocalStateField("user", presenceUser(BOB));

    const entries = readPresence(local, ADA.id);
    expect(entries.map((e) => [e.user.id, e.isSelf])).toEqual([[BOB.id, false]]);
  });

  it("ignores states without a valid user", () => {
    const local = awareness();
    const stranger = awareness();
    stranger.setLocalState({ user: { name: "no id" } });
    applyAwarenessUpdate(local, encodeAwarenessUpdate(stranger, [stranger.clientID]), "remote");

    expect(readPresence(local, ADA.id)).toEqual([]);
  });

  it("updates on join and leave, but not on a cursor move", () => {
    const local = awareness();
    setLocalUser(local, ADA);
    const { result } = renderHook(() => usePresence(local, ADA.id));
    expect(result.current.map((e) => e.user.name)).toEqual(["Ada"]);

    let bob: Awareness = local;
    act(() => {
      bob = join(local, BOB);
    });
    expect(result.current.map((e) => e.user.name)).toEqual(["Ada", "Bob"]);

    const before = result.current;
    act(() => {
      bob.setLocalStateField("cursor", { anchor: 1, head: 1 });
      applyAwarenessUpdate(local, encodeAwarenessUpdate(bob, [bob.clientID]), "remote");
    });
    expect(result.current).toBe(before);

    act(() => leave(local, bob));
    expect(result.current.map((e) => e.user.name)).toEqual(["Ada"]);
  });
});

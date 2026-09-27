import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import * as Y from "yjs";
import { PresenceList } from "@/components/room/presence-list";
import { setLocalUser, usePresence } from "@/lib/yjs/awareness";

const created: Awareness[] = [];
afterEach(() => {
  for (const a of created.splice(0)) {
    a.destroy();
  }
});

function awareness(): Awareness {
  const a = new Awareness(new Y.Doc());
  created.push(a);
  return a;
}

function relay(to: Awareness, from: Awareness) {
  act(() => {
    applyAwarenessUpdate(to, encodeAwarenessUpdate(from, [from.clientID]), "remote");
  });
}

// The list as the room renders it: fed from the live awareness by usePresence.
function LivePresenceList({ awareness, selfId }: { awareness: Awareness; selfId: string }) {
  return <PresenceList entries={usePresence(awareness, selfId)} />;
}

const list = () => within(screen.getByRole("complementary", { name: /in this room/i }));

describe("PresenceList", () => {
  it("shows everyone with an avatar or initials, this user first and marked", () => {
    const local = awareness();
    setLocalUser(local, { id: "u-me", name: "Grace Hopper", image: null });
    const ada = awareness();
    setLocalUser(ada, {
      id: "u-ada",
      name: "Ada",
      image: "https://avatars.githubusercontent.com/u/1",
    });
    render(<LivePresenceList awareness={local} selfId="u-me" />);
    relay(local, ada);

    expect(screen.getByRole("heading")).toHaveTextContent("In this room (2)");
    const items = list().getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["GHGrace Hopper(you)", "Ada"]);
    expect(within(items[1] as HTMLElement).getByRole("presentation")).toHaveAttribute(
      "src",
      "https://avatars.githubusercontent.com/u/1",
    );
  });

  it("adds people as they join and removes them when they leave", () => {
    const local = awareness();
    setLocalUser(local, { id: "u-me", name: "Me", image: null });
    render(<LivePresenceList awareness={local} selfId="u-me" />);
    expect(list().getAllByRole("listitem")).toHaveLength(1);

    const bob = awareness();
    setLocalUser(bob, { id: "u-bob", name: "Bob", image: null });
    relay(local, bob);
    expect(
      list()
        .getAllByRole("listitem")
        .map((i) => i.textContent),
    ).toEqual(["MMe(you)", "BBob"]);

    bob.setLocalState(null);
    relay(local, bob);
    expect(list().getAllByRole("listitem")).toHaveLength(1);
  });
});
